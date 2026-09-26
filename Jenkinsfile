// Forkwise CI/CD pipeline
// install deps -> unit tests -> sonar analysis -> sonar quality gate ->
// dependency/library scan -> build image -> trivy scan -> push to ECR ->
// deploy to k8s (Helm) -> api tests (post-deploy) -> slack alert
//
// Prerequisites (see JENKINS_SETUP.md for the full checklist):
//   Jenkins plugins : Pipeline, NodeJS, Docker Pipeline, SonarQube Scanner,
//                      Kubernetes CLI, Slack Notification, JUnit, HTML Publisher
//   Jenkins tools   : NodeJS ("node20"), a "SonarQube" server configured under
//                      Manage Jenkins > System, sonar-scanner + trivy + helm +
//                      kubectl + aws-cli on the agent (or use the docker agent below)
//   Jenkins creds   : aws-ecr-creds        (AWS access key/secret, "AWS Credentials")
//                      sonarqube-token      (Secret text)
//                      forkwise-kubeconfig  (Secret file - kubeconfig for the EKS cluster)
//                      slack-bot-token      (Secret text, used by the Slack plugin)

pipeline {
  agent {
    node {
      label 'Node-1'
    }
  }

  options {                                // pipeline-wide behaviour
        disableConcurrentBuilds()            // no two builds of this job at once
        timeout(time: 15, unit: 'MINUTES')   // kill if it hangs
    }

  parameters {
    choice(name: 'DEPLOY_ENV', choices: ['dev', 'staging', 'prod'], description: 'Target environment / Helm values overlay')
    booleanParam(name: 'SKIP_DEPLOY', defaultValue: false, description: 'Build/scan/push only — skip the Kubernetes deploy + API test stages')
  }



  environment {
    AWS_REGION        = 'us-east-1'
    AWS_ACCOUNT_ID     = '906303433456'                 // <-- replace with your account id, or inject via a credential
    ECR_REGISTRY       = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
    BACKEND_IMAGE      = 'forkwise-backend'
    FRONTEND_IMAGE     = 'forkwise-frontend'
    IMAGE_TAG          = "${env.BUILD_NUMBER}-${env.GIT_COMMIT?.take(7) ?: 'local'}"
    K8S_NAMESPACE       = "forkwise-${params.DEPLOY_ENV}"
    SONAR_PROJECT_KEY   = 'forkwise-food-delivery-app'
    TRIVY_SEVERITY      = 'CRITICAL,HIGH'
    SLACK_CHANNEL       = '#forkwise-ci'
  }

  stages {
    stage('Read version') {
      steps { 
        script {
          def packageJson = readJSON file: 'package.json'
          appVersion = packageJson.version        // e.g. 1.0.0
        }
      }  
    }

    stage('Install Dependencies') {
      parallel {
        stage('Backend') {
          steps {
            dir('backend') {
              sh 'npm ci --no-audit --no-fund'
            }
          }
        }
        stage('Frontend') {
          steps {
            dir('frontend') {
              sh 'npm ci --no-audit --no-fund'
            }
          }
        }
      }
    }

    stage('Unit Tests') {
      steps {
        dir('backend') {
          // Unit + API tests, with coverage (lcov -> Sonar) and JUnit XML (-> Jenkins + Sonar)
          sh 'npm run test:ci'
        }
      }
      post {
        always {
          junit testResults: 'backend/reports/junit.xml', allowEmptyResults: true
          publishHTML(target: [
            reportDir: 'backend/coverage/lcov-report',
            reportFiles: 'index.html',
            reportName: 'Backend Coverage Report',
            keepAll: true,
            alwaysLinkToLastBuild: true
          ])
        }
      }
    }

    stage('Sonar Analysis') {
      steps {
        dir('.') {
          withSonarQubeEnv('sonar-scanner') {   // name of the server configured in Manage Jenkins > System
            sh '''
              sonar-scanner \
                -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                -Dsonar.projectVersion=${IMAGE_TAG}
            '''
          }
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

    stage('Dependency / Library Scan') {
      parallel {
        stage('Backend npm audit') {
          steps {
            dir('backend') {
              // Non-zero exit on high/critical vulns fails the build; swap for
              // the OWASP Dependency-Check plugin if you need SBOM/CVE reports.
              sh 'npm audit --audit-level=high'
            }
          }
        }
        stage('Frontend npm audit') {
          steps {
            dir('frontend') {
              sh 'npm audit --audit-level=high'
            }
          }
        }
      }
    }

    stage('Build Docker Images') {
      parallel {
        stage('Backend image') {
          steps {
            dir('backend') {
              script {
                withAWS(credentials: 'aws-creds', region: 'us-east-1') {
                  sh """
                  aws ecr get-login-password --region us-east-1 \
                    | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com
                  docker build -t ${ECR_REGISTRY}/${BACKEND_IMAGE}:${IMAGE_TAG} .
                  """
            }
          }
        }
      }
    }
        stage('Frontend image') {
          steps {
            dir('frontend') {
              script {
                withAWS(credentials: 'aws-creds', region: 'us-east-1') {
                  sh """
                    aws ecr get-login-password --region us-east-1 \
                      | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com
                    docker build -t ${ECR_REGISTRY}/${FRONTEND_IMAGE}:${IMAGE_TAG} .
                  """
                }
              }
            }
          }
        }
      }
    }
    stage('Trivy Scan') {
      parallel {
        stage('Backend image scan') {
          steps {
            sh """
              trivy image --exit-code 1 --severity ${TRIVY_SEVERITY} \
                --format table --output trivy-backend.txt \
                ${ECR_REGISTRY}/${BACKEND_IMAGE}:${IMAGE_TAG}
            """
          }
        }
        stage('Frontend image scan') {
          steps {
            sh """
              trivy image --exit-code 1 --severity ${TRIVY_SEVERITY} \
                --format table --output trivy-frontend.txt \
                ${ECR_REGISTRY}/${FRONTEND_IMAGE}:${IMAGE_TAG}
            """

          }
        }
      }
    }
    //   post {
    //     always {
    //       archiveArtifacts artifacts: 'trivy-*.txt', allowEmptyArchive: true
    //     }
    //   }
    // }

    stage('Push to ECR') {
      steps {
        withCredentials([[$class: 'AmazonWebServicesCredentialsBinding', credentialsId: 'aws-ecr-creds']]) {
          sh """
            aws ecr get-login-password --region ${AWS_REGION} | \
              docker login --username AWS --password-stdin ${ECR_REGISTRY}

            docker push ${ECR_REGISTRY}/${BACKEND_IMAGE}:${IMAGE_TAG}
            docker tag  ${ECR_REGISTRY}/${BACKEND_IMAGE}:${IMAGE_TAG} ${ECR_REGISTRY}/${BACKEND_IMAGE}:latest
            docker push ${ECR_REGISTRY}/${BACKEND_IMAGE}:latest

            docker push ${ECR_REGISTRY}/${FRONTEND_IMAGE}:${IMAGE_TAG}
            docker tag  ${ECR_REGISTRY}/${FRONTEND_IMAGE}:${IMAGE_TAG} ${ECR_REGISTRY}/${FRONTEND_IMAGE}:latest
            docker push ${ECR_REGISTRY}/${FRONTEND_IMAGE}:latest
          """
        }
      }
    }

    stage('Deploy to Kubernetes') {
      when { expression { return !params.SKIP_DEPLOY } }
      steps {
        withCredentials([file(credentialsId: 'forkwise-kubeconfig', variable: 'KUBECONFIG')]) {
          sh """
            kubectl get namespace ${K8S_NAMESPACE} || kubectl create namespace ${K8S_NAMESPACE}

            helm upgrade --install forkwise-backend ./helm/backend \
              --namespace ${K8S_NAMESPACE} \
              --values ./helm/backend/values.yaml \
              -f ./helm/backend/values-${DEPLOY_ENV}.yaml \
              --set image.repository=${ECR_REGISTRY}/${BACKEND_IMAGE} \
              --set image.tag=${IMAGE_TAG} \
              --wait --timeout 5m

            helm upgrade --install forkwise-frontend ./helm/frontend \
              --namespace ${K8S_NAMESPACE} \
              --values ./helm/frontend/values.yaml \
              -f ./helm/frontend/values-${DEPLOY_ENV}.yaml \
              --set image.repository=${ECR_REGISTRY}/${FRONTEND_IMAGE} \
              --set image.tag=${IMAGE_TAG} \
              --wait --timeout 5m
          """
        }
      }
    }

  //   stage('API Tests (Post-Deploy)') {
  //     when { expression { return !params.SKIP_DEPLOY } }
  //     steps {
  //       withCredentials([file(credentialsId: 'forkwise-kubeconfig', variable: 'KUBECONFIG')]) {
  //         dir('backend') {
  //           sh """
  //             # Port-forward the in-cluster Service so tests hit the freshly
  //             # deployed Pods directly, with no Ingress/DNS/TLS to configure.
  //             kubectl -n ${K8S_NAMESPACE} port-forward svc/forkwise-backend 4000:4000 &
  //             PF_PID=\$!
  //             sleep 5
  //             BASE_URL=http://localhost:4000 npm run test:smoke
  //             TEST_EXIT=\$?
  //             kill \$PF_PID || true
  //             exit \$TEST_EXIT
  //           """
  //         }
  //       }
  //     }
  //     post {
  //       always {
  //         junit testResults: 'backend/reports/junit-smoke.xml', allowEmptyResults: true
  //       }
  //     }
  //   }
  // }

  // post {
  //   success {
  //     slackSend(channel: env.SLACK_CHANNEL, color: 'good',
  //       message: ":white_check_mark: *${env.JOB_NAME}* #${env.BUILD_NUMBER} succeeded (env: ${params.DEPLOY_ENV}, image tag: ${env.IMAGE_TAG})\n${env.BUILD_URL}")
  //   }
  //   failure {
  //     slackSend(channel: env.SLACK_CHANNEL, color: 'danger',
  //       message: ":x: *${env.JOB_NAME}* #${env.BUILD_NUMBER} failed at stage `${env.STAGE_NAME}` (env: ${params.DEPLOY_ENV})\n${env.BUILD_URL}console")
  //   }
  //   unstable {
  //     slackSend(channel: env.SLACK_CHANNEL, color: 'warning',
  //       message: ":warning: *${env.JOB_NAME}* #${env.BUILD_NUMBER} is unstable (env: ${params.DEPLOY_ENV})\n${env.BUILD_URL}")
  //   }
  //   always {
  //     sh 'docker image prune -f || true'
  //     cleanWs()
  //   }
  // }
