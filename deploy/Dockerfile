# 使用 NGINX 1.24 官方镜像
FROM nginx:1.24

# 删除默认的 NGINX 配置文件和静态文件
RUN rm -rf /usr/share/nginx/html/*

# 复制 dist 文件夹到 NGINX 默认服务目录
COPY dist /usr/share/nginx/html

# 暴露 80 端口
EXPOSE 80

# 启动 NGINX
CMD ["nginx", "-g", "daemon off;"]