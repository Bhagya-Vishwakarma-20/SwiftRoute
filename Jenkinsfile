pipeline {
    agent any

    tools {
        nodejs 'Node-20'
    }

    environment {
        JWT_SECRET    = 'ci-test-secret'
        NODE_ENV      = 'test'
    }

    options {
        timeout(time: 15, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    stages {
        stage('CI') {
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
                            echo 'CI — Tests stage completed'
                        }
                    }
                }
            }
        }

        stage('CD') {
            when {
                allOf {
                    branch 'main'
                }
            }
            stages {
                stage('Docker Build & Push') {
                    steps {
                        withCredentials([usernamePassword(
                            credentialsId: 'dockerhub-creds',
                            usernameVariable: 'DOCKER_USER',
                            passwordVariable: 'DOCKER_PASS'
                        )]) {
                            sh '''
                                docker build -t "$DOCKER_USER/redirect:build-${BUILD_NUMBER}" .
                                echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                                docker tag "$DOCKER_USER/redirect:build-${BUILD_NUMBER}" "$DOCKER_USER/redirect:latest"
                                docker push "$DOCKER_USER/redirect:build-${BUILD_NUMBER}"
                                docker push "$DOCKER_USER/redirect:latest"
                            '''
                        }
                    }
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
