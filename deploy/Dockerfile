# 使用 NGINX 1.24 镜像
FROM 192.168.10.132/library/nginx:1.24


RUN apt-get update && apt-get install -y unzip && rm -rf /var/lib/apt/lists/*
RUN rm -rf /usr/share/nginx/html/*
COPY /apps/web-antd/dist.zip /tmp/dist.zip
RUN unzip /tmp/dist.zip -d /usr/share/nginx/html/ && rm /tmp/dist.zip

# 暴露 80 端口
EXPOSE 80

# 启动 NGINX
CMD ["nginx", "-g", "daemon off;"]