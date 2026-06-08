FROM nginx:1.27-alpine

ENV ENGINE_URL=http://localhost:3000

COPY dist/web-chat/browser /usr/share/nginx/html

CMD sh -c 'printf "{\"engineUrl\":\"%s\"}\n" "$ENGINE_URL" > /usr/share/nginx/html/runtime-config.json && nginx -g "daemon off;"'
