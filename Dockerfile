# projectfirst1/Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

# คัดลอกโค้ดทั้งหมด รวม public folder
COPY . .

# Build React app (public folder จะถูกคัดลอกไปใน build/ อัตโนมัติ)
RUN npm run build

# ติดตั้ง serve
RUN npm install -g serve

EXPOSE 3000

# serve จะ serve ทั้ง build/ และ public/ อัตโนมัติ
CMD ["serve", "-s", "build", "-l", "3000"]