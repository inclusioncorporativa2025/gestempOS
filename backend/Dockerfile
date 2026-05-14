# Usa una imagen base de Node.js
FROM node:16

# Define el directorio de trabajo en el contenedor
WORKDIR /usr/src/app

# Copia los archivos de tu aplicación al contenedor
COPY package*.json ./

# Instala las dependencias de la aplicación
RUN npm install

# Copia el resto de los archivos de tu proyecto
COPY . .

# Expón el puerto 5000 para acceder a tu aplicación desde fuera del contenedor
EXPOSE 5000

# Define el comando para ejecutar la aplicación
CMD ["npm", "start"]
