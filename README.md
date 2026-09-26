# Food Delivery - Kubernetes + Helm + Jenkins

## Structure

app/                 Node.js API
helm/food-delivery/  Helm chart
Jenkinsfile          CI/CD pipeline

## Endpoints

GET /healthz
GET /readyz
GET /api/restaurants
POST /api/orders

## Jenkins credentials

aws-ecr-creds       AWS credential with ECR access
forkwise-kubeconfig Kubeconfig file for the EKS cluster

Replace YOUR_AWS_ACCOUNT_ID in Jenkinsfile.

## Environments

dev -> food-dev
sit -> food-sit
prod -> food-prod

Each environment uses its own Helm values file.

## Manual Helm deployment

helm upgrade --install food-delivery ./helm/food-delivery   -n food-dev --create-namespace   -f ./helm/food-delivery/values-dev.yaml   --set image.repository=YOUR_ECR_REPOSITORY   --set image.tag=1.0.0

kubectl get pods -n food-dev
kubectl get svc -n food-dev
