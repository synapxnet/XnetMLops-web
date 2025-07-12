pipeline {
  agent {
    node {
      label 'nodejs'
    }

  }
  stages {
    stage('Clone repository') {
      agent none
      steps {
        checkout([$class: 'GitSCM', branches: [[name: 'master']], 
                    extensions: [[$class: 'CloneOption', depth: 1, shallow: true]], userRemoteConfigs: [[url: 'https://gitee.com/synap-xnet/xnet-mlops-web.git']]
                ])
      }
    }

    stage('Run npm install') {
      steps {
        container('nodejs') {
          sh 'npm install'
        }

      }
    }

    stage('Run test') {
      steps {
        container('nodejs') {
          sh 'npm run test'
        }

      }
    }

    stage('Run build') {
      steps {
        container('nodejs') {
          sh 'npm run build'
        }

      }
    }

    stage('Archive artifacts') {
      steps {
        container('base') {
          sh 'zip -r dist.zip dist/'
        }

        archiveArtifacts(artifacts: 'dist.zip', followSymlinks: false)
      }
    }

  }
}
