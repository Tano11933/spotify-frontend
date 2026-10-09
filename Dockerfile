# ---- Build ----
FROM node:20-alpine AS builder

WORKDIR /app

# package files disalin lebih dulu supaya layer `npm ci` tidak ikut invalid
# setiap kali kode berubah.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# URL backend di-resolve saat BUILD, bukan runtime: Vite menanamkan nilai
# import.meta.env ke dalam bundle. Browser yang membuka aplikasi berjalan di
# host, jadi localhost:9000 benar (bukan nama service Docker).
ARG VITE_API_BASE_URL=http://localhost:9000
ARG VITE_WS_URL=ws://localhost:9000/ws
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_WS_URL=$VITE_WS_URL

RUN npm run build

# ---- Serve ----
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
