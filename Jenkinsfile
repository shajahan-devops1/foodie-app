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

    stage('SonarQube Analysis') {
      steps {
        withSonarQubeEnv('sonar-server') {
            sh "${tool 'sonar-8'}/bin/sonar-scanner"
        }
      }
    }

    stage('Sonar Quality Gate') {
      steps {
        timeout(time: 15, unit: 'MINUTES') {
          // Requires the SonarQube webhook to be configured to call back to
          // Jenkins (Administration > Configuration > Webhooks in SonarQube).
          waitForQualityGate abortPipeline: true
        }
      }
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
// Forkwise CI/CD pipeline
// install deps -> unit tests -> sonar analysis -> sonar quality gate ->
// dependency/library scan -> build image -> trivy scan -> push to ECR ->
// deploy to k8s (Helm) -> api tests (post-deploy) -> slack alert
//
// Prerequisites (see JENKINS_SETUP.md for the full checklist):
//   Jenkins plugins : Pipeline, NodeJS, Docker Pipeline, SonarQube Scanner,
//                      Kubernetes CLI, Slack Notification, JUnit, HTML Publisher
//   Jenkins tools   : NodeJS ("node20"), a "sonar-scanner" server configured under
//                      Manage Jenkins > System, sonar-scanner + trivy + helm +
//                      kubectl + aws-cli on the agent (or use the docker agent below)
//   Jenkins creds   : aws-ecr-creds        (AWS access key/secret, "AWS Credentials")
//                      sonarqube-token      (Secret text)
//                      forkwise-kubeconfig  (Secret file - kubeconfig for the EKS cluster)
//                      slack-bot-token      (Secret text, used by the Slack plugin)

// pipeline {
//   agent {
//     node {
//       label 'Node-1'
//     }
//   }

//   options {                                // pipeline-wide behaviour
//     disableConcurrentBuilds()               // no two builds of this job at once
//     timeout(time: 60, unit: 'MINUTES')      // kill if it hangs (15 min was too tight for a full build+deploy)
//   }

//   parameters {
//     choice(name: 'DEPLOY_ENV', choices: ['dev', 'staging', 'prod'], description: 'Target environment / Helm values overlay')
//     booleanParam(name: 'SKIP_DEPLOY', defaultValue: false, description: 'Build/scan/push only — skip the Kubernetes deploy + API test stages')
//   }

//   environment {
//     AWS_REGION         = 'us-east-1'
//     AWS_ACCOUNT_ID      = '906303433456'                 // <-- replace with your account id, or inject via a credential
//     ECR_REGISTRY        = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
//     BACKEND_IMAGE       = 'forkwise-backend'
//     FRONTEND_IMAGE      = 'forkwise-frontend'
//     IMAGE_TAG           = "${env.BUILD_NUMBER}-${env.GIT_COMMIT?.take(7) ?: 'local'}"
//     K8S_NAMESPACE       = "forkwise-${params.DEPLOY_ENV}"
//     SONAR_PROJECT_KEY   = 'forkwise-food-delivery-app'
//     TRIVY_SEVERITY      = 'CRITICAL,HIGH'
//     SLACK_CHANNEL       = '#forkwise-ci'
//   }

//   stages {

//     stage('Read version') {
//       steps {
//         script {
//           // NOTE: there's no root-level package.json in this repo — only
//           // backend/package.json and frontend/package.json. Reading the
//           // backend's version here; appVersion isn't consumed elsewhere
//           // yet, this is just exposed for a future stage (e.g. tagging
//           // images with it instead of/alongside IMAGE_TAG).
//           def packageJson = readJSON file: 'backend/package.json'
//           appVersion = packageJson.version // e.g. 1.0.0
//         }
//       }
//     }

//     stage('Install Dependencies') {
//       parallel {
//         stage('Backend') {
//           steps {
//             dir('backend') {
//               sh 'npm ci --no-audit --no-fund'
//             }
//           }
//         }
//         stage('Frontend') {
//           steps {
//             dir('frontend') {
//               sh 'npm ci --no-audit --no-fund'
//             }
//           }
//         }
//       }
//     }

//     // stage('Unit Tests') {
//     //   steps {
//     //     dir('backend') {
//     //       // Unit + API tests, with coverage (lcov -> Sonar) and JUnit XML (-> Jenkins + Sonar)
//     //       sh 'npm run test:ci'
//     //     }
//     //   }
//     //   post {
//     //     always {
//     //       junit testResults: 'backend/reports/junit.xml', allowEmptyResults: true
//     //       publishHTML(target: [
//     //         reportDir: 'backend/coverage/lcov-report',
//     //         reportFiles: 'index.html',
//     //         reportName: 'Backend Coverage Report',
//     //         keepAll: true,
//     //         alwaysLinkToLastBuild: true
//     //       ])
//     //     }
//     //   }
//     // }

//     stage('Sonar Analysis') {
//       steps {
//         script {
//           def scannerHome = tool 'sonar-8'   // resolves the Jenkins "SonarQube Scanner" tool installation to a path
//           withSonarQubeEnv('sonar-scanner') { // name of the SonarQube *server* config in Manage Jenkins > System
//             sh """
//               ${scannerHome}/bin/sonar-scanner \
//                 -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
//                 -Dsonar.projectVersion=${IMAGE_TAG}
//             """
//           }
//         }
//       }
//     }

//     stage('Sonar Quality Gate') {
//       steps {
//         timeout(time: 15, unit: 'MINUTES') {
//           // Requires the SonarQube webhook to be configured to call back to
//           // Jenkins (Administration > Configuration > Webhooks in SonarQube).
//           waitForQualityGate abortPipeline: true
//         }
//       }
//     }

//     stage('Dependency / Library Scan') {
//       parallel {
//         stage('Backend npm audit') {
//           steps {
//             dir('backend') {
//               // Non-zero exit on high/critical vulns fails the build; swap for
//               // the OWASP Dependency-Check plugin if you need SBOM/CVE reports.
//               sh 'npm audit --audit-level=high'
//             }
//           }
//         }
//         stage('Frontend npm audit') {
//           steps {
//             dir('frontend') {
//               sh 'npm audit --audit-level=high'
//             }
//           }
//         }
//       }
//     }

//     stage('Build Docker Images') {
//       parallel {
//         stage('Backend image') {
//           steps {
//             dir('backend') {
//               sh "docker build -t ${ECR_REGISTRY}/${BACKEND_IMAGE}:${IMAGE_TAG} ."
//             }
//           }
//         }
//         stage('Frontend image') {
//           steps {
//             dir('frontend') {
//               sh "docker build -t ${ECR_REGISTRY}/${FRONTEND_IMAGE}:${IMAGE_TAG} ."
//             }
//           }
//         }
//       }
//     }

//     stage('Trivy Scan') {
//       parallel {
//         stage('Backend image scan') {
//           steps {
//             sh """
//               trivy image --exit-code 1 --severity ${TRIVY_SEVERITY} \
//                 --format table --output trivy-backend.txt \
//                 ${ECR_REGISTRY}/${BACKEND_IMAGE}:${IMAGE_TAG}
//             """
//           }
//         }
//         stage('Frontend image scan') {
//           steps {
//             sh """
//               trivy image --exit-code 1 --severity ${TRIVY_SEVERITY} \
//                 --format table --output trivy-frontend.txt \
//                 ${ECR_REGISTRY}/${FRONTEND_IMAGE}:${IMAGE_TAG}
//             """
//           }
//         }
//       }
//       post {
//         always {
//           archiveArtifacts artifacts: 'trivy-*.txt', allowEmptyArchive: true
//         }
//       }
//     }

//     stage('Push to ECR') {
//       steps {
//         withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'aws-ecr-creds']]) {
//           sh """
//             aws ecr get-login-password --region ${AWS_REGION} | \
//               docker login --username AWS --password-stdin ${ECR_REGISTRY}

//             docker push ${ECR_REGISTRY}/${BACKEND_IMAGE}:${IMAGE_TAG}
//             docker tag  ${ECR_REGISTRY}/${BACKEND_IMAGE}:${IMAGE_TAG} ${ECR_REGISTRY}/${BACKEND_IMAGE}:latest
//             docker push ${ECR_REGISTRY}/${BACKEND_IMAGE}:latest

//             docker push ${ECR_REGISTRY}/${FRONTEND_IMAGE}:${IMAGE_TAG}
//             docker tag  ${ECR_REGISTRY}/${FRONTEND_IMAGE}:${IMAGE_TAG} ${ECR_REGISTRY}/${FRONTEND_IMAGE}:latest
//             docker push ${ECR_REGISTRY}/${FRONTEND_IMAGE}:latest
//           """
//         }
//       }
//     }

//     stage('Deploy to Kubernetes') {
//       when { expression { return !params.SKIP_DEPLOY } }
//       steps {
//         withCredentials([file(credentialsId: 'forkwise-kubeconfig', variable: 'KUBECONFIG')]) {
//           sh """
//             kubectl get namespace ${K8S_NAMESPACE} || kubectl create namespace ${K8S_NAMESPACE}

//             helm upgrade --install forkwise-backend ./helm/backend \
//               --namespace ${K8S_NAMESPACE} \
//               --values ./helm/backend/values.yaml \
//               -f ./helm/backend/values-${DEPLOY_ENV}.yaml \
//               --set image.repository=${ECR_REGISTRY}/${BACKEND_IMAGE} \
//               --set image.tag=${IMAGE_TAG} \
//               --wait --timeout 5m

//             helm upgrade --install forkwise-frontend ./helm/frontend \
//               --namespace ${K8S_NAMESPACE} \
//               --values ./helm/frontend/values.yaml \
//               -f ./helm/frontend/values-${DEPLOY_ENV}.yaml \
//               --set image.repository=${ECR_REGISTRY}/${FRONTEND_IMAGE} \
//               --set image.tag=${IMAGE_TAG} \
//               --wait --timeout 5m
//           """
//         }
//       }
//     }
//   }

//   post {
//     success {
//       slackSend(channel: env.SLACK_CHANNEL, color: 'good',
//         message: ":white_check_mark: *${env.JOB_NAME}* #${env.BUILD_NUMBER} succeeded (env: ${params.DEPLOY_ENV}, image tag: ${env.IMAGE_TAG})\n${env.BUILD_URL}")
//     }
//     failure {
//       slackSend(channel: env.SLACK_CHANNEL, color: 'danger',
//         message: ":x: *${env.JOB_NAME}* #${env.BUILD_NUMBER} failed at stage `${env.STAGE_NAME}` (env: ${params.DEPLOY_ENV})\n${env.BUILD_URL}console")
//     }
//     unstable {
//       slackSend(channel: env.SLACK_CHANNEL, color: 'warning',
//         message: ":warning: *${env.JOB_NAME}* #${env.BUILD_NUMBER} is unstable (env: ${params.DEPLOY_ENV})\n${env.BUILD_URL}")
//     }
//     always {
//       sh 'docker image prune -f || true'
//       cleanWs()
//     }
//   }
// }