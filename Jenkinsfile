pipeline {
    agent any

    tools {
        nodejs 'Node-20'   
    }

    environment {
        JWT_SECRET    = 'ci-test-secret'
        NODE_ENV      = 'test'
        DOCKER_IMAGE  = 'bhagya888/redirect'
    }

    options {
        timeout(time: 15, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Generate Prisma Client') {
            steps {
                sh 'npx prisma generate'
            }
        }

        stage('Unit Tests') {
            steps {
                sh 'npm test'
            }
            post {
                always {
                    echo 'Tests stage completed'
                }
            }
        }

        stage('Docker Build') {
            steps {
                sh "docker build -t ${DOCKER_IMAGE}:build-${BUILD_NUMBER} ."
            }
        }

        stage('Docker Push') {
            when {
                branch 'main'
            }
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-creds',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh '''
                        echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                        docker tag ${DOCKER_IMAGE}:build-${BUILD_NUMBER} ${DOCKER_IMAGE}:latest
                        docker push ${DOCKER_IMAGE}:build-${BUILD_NUMBER}
                        docker push ${DOCKER_IMAGE}:latest
                    '''
                }
            }
        }
    }

    post {
        success {
            echo "Pipeline succeeded — build #${BUILD_NUMBER}"
        }
        failure {
            echo "Pipeline failed — build #${BUILD_NUMBER}"
        }
        always {
            cleanWs()
        }
    }
}
