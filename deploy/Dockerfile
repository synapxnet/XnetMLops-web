# 使用 NGINX 1.24 镜像
FROM 192.168.10.132/library/nginx:1.24


RUN rm -rf /usr/share/nginx/html/*

COPY /apps/web-antd/dist/* /usr/share/nginx/html/


# 暴露 80 端口
EXPOSE 80

# 启动 NGINX
CMD ["nginx", "-g", "daemon off;"]