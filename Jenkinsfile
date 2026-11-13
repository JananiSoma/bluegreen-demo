pipeline {
  agent any
  environment {
    PATH  = "/opt/homebrew/bin:/usr/local/bin:/Applications/Docker.app/Contents/Resources/bin:${env.PATH}"
    IMAGE = "jananisoma/bluegreen-demo"
    TAG   = "${BUILD_NUMBER}"
  }
  stages {
    stage('Checkout') { steps { checkout scm } }

    stage('Build & Push') {
      steps {
        withCredentials([usernamePassword(credentialsId: 'dockerhub-creds',
            usernameVariable: 'U', passwordVariable: 'P')]) {
          sh '''
            docker build -t $IMAGE:$TAG .
            echo $P | docker login -u $U --password-stdin
            docker push $IMAGE:$TAG
          '''
        }
      }
    }

    stage('Find Live Color') {
      steps {
        script {
          def live = sh(returnStdout: true,
            script: "kubectl get svc demo-svc -o jsonpath='{.spec.selector.color}'").trim()
          env.LIVE = live
          env.IDLE = (live == 'blue') ? 'green' : 'blue'
          echo "Live: ${env.LIVE}  |  Deploying to: ${env.IDLE}"
        }
      }
    }

    stage('Deploy to Idle Color') {
      steps {
        sh '''
          sed -e "s|__COLOR__|$IDLE|g" -e "s|__IMAGE__|$IMAGE:$TAG|" \
              -e "s|__VERSION__|build $TAG ($IDLE)|" k8s/deployment-template.yaml | kubectl apply -f -
          kubectl rollout status deployment/app-$IDLE
        '''
      }
    }

    stage('Smoke Test Idle') {
      steps {
        sh '''
          POD_IP=$(kubectl get pod -l app=demo,color=$IDLE -o jsonpath='{.items[0].status.podIP}')
          kubectl delete pod smoke --ignore-not-found
          kubectl run smoke --rm -i --restart=Never --image=curlimages/curl -- curl -s http://$POD_IP:3000
        '''
      }
    }

    stage('Approve Switch') {
      steps { input message: "Switch traffic to ${env.IDLE}?" }
    }

    stage('Switch Traffic') {
      steps {
        sh '''
          kubectl patch svc demo-svc -p '{"spec":{"selector":{"app":"demo","color":"'"$IDLE"'"}}}'
        '''
      }
    }
  }
  post {
    failure { echo 'Failed. Live environment untouched, so no downtime.' }
  }
}
