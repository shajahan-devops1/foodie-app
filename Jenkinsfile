pipeline {
  agent { label 'Node-1' }

  options {
    disableConcurrentBuilds()
    timestamps()
    timeout(time: 15, unit: 'MINUTES')
  }

  parameters {
    choice(name: 'DEPLOY_ENV', choices: ['dev','sit','prod'], description: 'Kubernetes environment')
    booleanParam(name: 'SKIP_DEPLOY', defaultValue: false, description: 'Build and scan only')
  }

  environment {
    AWS_REGION = 'us-east-1'
    AWS_ACCOUNT_ID = '906303433456'
    ECR_REGISTRY = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
    IMAGE_REPO = 'food-delivery'
    IMAGE_TAG = "${BUILD_NUMBER}-${GIT_COMMIT}"
    K8S_NAMESPACE = "food-${params.DEPLOY_ENV}"
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Install & Test') {
      steps {
        dir('app') {
          sh 'npm install'
          sh 'npm ci && npm test'
        }
      }
    }

    // grounded in the commented SonarQube block, nodejsEKSPipeline.groovy
    stage('SonarQube Analysis') {
      steps {
        withSonarQubeEnv('sonar-scanner') {
          sh "${tool 'sonar-8'}/bin/sonar-scanner"
        }
      }
    }
    stage('SonarQube Quality Gate') {
      steps { timeout(time: 10, unit: 'MINUTES') { script {
        def qg = waitForQualityGate()          // pause until Sonar answers
        if (qg.status != 'OK') {
          error "Pipeline aborted: ${qg.status}"   // fail the build
        }
      }}}
    }

    stage('Build Docker Image') {
      steps {
        withAWS(credentials: 'aws-creds', region: "${AWS_REGION}") {
          sh '''
            aws ecr get-login-password --region "$AWS_REGION" |
              docker login --username AWS --password-stdin "$ECR_REGISTRY"
            docker build -t "$ECR_REGISTRY/$IMAGE_REPO:$IMAGE_TAG" ./app
          '''
        }
      }
    }

    stage('Trivy Scan') {
      steps {
        sh '''
          trivy image --exit-code 1 --severity HIGH,CRITICAL             --format table "$ECR_REGISTRY/$IMAGE_REPO:$IMAGE_TAG"
        '''
      }
    }

    stage('Push to ECR') {
      when { expression { return !params.SKIP_DEPLOY } }
      steps {
        withAWS(credentials: 'aws-ecr-creds', region: "${AWS_REGION}") {
          sh 'docker push "$ECR_REGISTRY/$IMAGE_REPO:$IMAGE_TAG"'
        }
      }
    }

    stage('Deploy to Kubernetes') {
      when { expression { return !params.SKIP_DEPLOY } }
      steps {
        withAWS(credentials: 'aws-creds', region: 'us-east-1') {
          sh '''
            aws eks update-kubeconfig --name roboshop --region us-east-1
            kubectl create namespace "$K8S_NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

            helm upgrade --install food-delivery ./helm/food-delivery               --namespace "$K8S_NAMESPACE"               -f "./helm/food-delivery/values-${DEPLOY_ENV}.yaml"               --set image.repository="$ECR_REGISTRY/$IMAGE_REPO"               --set image.tag="$IMAGE_TAG"               --wait --timeout 5m

            kubectl rollout status deployment/food-delivery-food-delivery               -n "$K8S_NAMESPACE" --timeout=5m
            kubectl get pods -n "$K8S_NAMESPACE"
          '''
        }
      }
    }

    stage('Smoke Test') {
      when { expression { return !params.SKIP_DEPLOY } }
      steps {
        withCredentials([file(credentialsId: 'forkwise-kubeconfig', variable: 'KUBECONFIG')]) {
          sh '''
            kubectl -n "$K8S_NAMESPACE" run food-smoke-test               --rm -i --restart=Never               --image=curlimages/curl:8.10.1               --command -- curl -fsS http://food-delivery-food-delivery/healthz
          '''
        }
      }
    }
  }

  post {
    success { echo "Food delivery pipeline completed successfully for ${params.DEPLOY_ENV}" }
    failure { echo "Food delivery pipeline failed." }
    always {
      sh 'docker image prune -f || true'
      cleanWs()
    }
  }
}
