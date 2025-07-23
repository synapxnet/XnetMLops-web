# 使用 NGINX 1.24 镜像
FROM 192.168.10.132/library/nginx:1.24

RUN mkdir -p /usr/share/nginx/html
# 删除默认的 NGINX 配置文件和静态文件
RUN rm -rf /usr/share/nginx/html/*

# 复制 dist 文件夹到 NGINX 默认服务目录，调整路径
COPY apps/web-antd/dist /usr/share/nginx/html

RUN chown -R nginx:nginx /usr/share/nginx/html

# 暴露 80 端口
EXPOSE 80

# 启动 NGINX
CMD ["nginx", "-g", "daemon off;"]