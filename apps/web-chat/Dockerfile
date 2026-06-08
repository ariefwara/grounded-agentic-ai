FROM nginx:1.27-alpine

ENV PORT=8080
ENV ENGINE_URL=http://localhost:3000

COPY dist/web-chat/browser /usr/share/nginx/html

CMD sh -c 'printf "{\"engineUrl\":\"%s\"}\n" "$ENGINE_URL" > /usr/share/nginx/html/runtime-config.json && printf "server { listen %s; server_name _; root /usr/share/nginx/html; index index.html; location / { try_files \\$uri \\$uri/ /index.html; } }\n" "$PORT" > /etc/nginx/conf.d/default.conf && nginx -g "daemon off;"'
