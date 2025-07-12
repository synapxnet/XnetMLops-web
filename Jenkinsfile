pipeline {
  agent {
    kubernetes {
      inheritFrom 'nodejs bare'
      containerTemplate {
        name 'nodejs'
        image 'registry.cn-hangzhou.aliyuncs.com/kubesphere-agent/builder-nodejs:v23.8.0'
      }

    }

  }
  stages {
    stage('环境验证') {
      steps {
        container('nodejs') {
          sh '''
            echo "===== 环境信息 ====="
            echo "Node.js: $(node --version)"
            echo "npm: $(npm --version)"
          '''
        }

      }
    }

    stage('拉取代码') {
      steps {
        container('nodejs') {
          git(url: 'https://gitee.com/synap-xnet/xnet-mlops-web.git', credentialsId: 'synap-xnet-gitee-id', branch: 'master', changelog: true, poll: false)
        }

      }
    }

    stage('安装依赖') {
      steps {
        container('nodejs') {
          sh 'npm config set registry https://registry.npmmirror.com && npm install pnpm -g'
          sh 'rm -rf node_modules pnpm-lock.yaml'
          sh 'cd apps/web-antd && npm install'
        }

      }
    }

    stage('构建') {
      agent none
      steps {
        container('nodejs') {
          sh 'cd apps/web-antd && npm run build'
        }

      }
    }

    stage('归档制品') {
      steps {
        container('nodejs') {
          sh 'cd apps/web-antd && zip -r dist-${BUILD_NUMBER}.zip dist/'
        }

        archiveArtifacts(artifacts: 'dist-*.zip', fingerprint: true, onlyIfSuccessful: true)
      }
    }

  }
  post {
    always {
      cleanWs()
    }

    success {
      slackSend(color: 'good', message: "构建成功: ${env.JOB_NAME} #${env.BUILD_NUMBER}")
    }

    failure {
      slackSend(color: 'danger', message: "构建失败: ${env.JOB_NAME} #${env.BUILD_NUMBER}")
    }

  }
}
