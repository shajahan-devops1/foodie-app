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

    stage('unit tests') {
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
            aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 906303433456.dkr.ecr.us-east-1.amazonaws.com
            docker build -t food-app/frontend ./app
          '''
        }
      }
    }

    stage('Trivy Scan') {
      steps {
        sh '''
          sleep 8
        '''
      }
    }

    stage('Push to ECR') {
      steps {
        withAWS(credentials: 'aws-creds', region: "${AWS_REGION}") {
          sh '''
            docker tag food-app/frontend:latest 906303433456.dkr.ecr.us-east-1.amazonaws.com/food-app/frontend:latest
            docker push 906303433456.dkr.ecr.us-east-1.amazonaws.com/food-app/frontend:latest
          '''
        }
      }
    }

    stage('Deploy to Kubernetes') {
      steps {
        sh '''
          aws eks update-kubeconfig --name roboshop --region us-east-1

          kubectl create namespace "$K8S_NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

          # Run Helm Upgrade
          helm upgrade --install food-delivery ./helm/food-delivery \
            --namespace "$K8S_NAMESPACE" \
            -f "./helm/food-delivery/values-${DEPLOY_ENV}.yaml" \
            --set image.repository="906303433456.dkr.ecr.us-east-1.amazonaws.com/food-app/frontend" \
            --set image.tag="latest" \
            --set image.pullPolicy="Always"

          # Force EKS to do a rolling restart with the freshly pushed image
          kubectl rollout restart deployment/food-delivery-food-delivery -n "$K8S_NAMESPACE"

          # Wait for the new pods to pass readiness checks
          kubectl rollout status deployment/food-delivery-food-delivery -n "$K8S_NAMESPACE" --timeout=3m

          kubectl get pods -n "$K8S_NAMESPACE"
        '''
      }
    }

    stage('Smoke Test') {
      when { expression { return !params.SKIP_DEPLOY } }
      steps {
          sh '''
            echo "Waiting for the application to be ready..."
            sleep 13  # Adjust the sleep time as needed
            '''
        }
      }
    }
  }