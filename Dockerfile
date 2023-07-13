# Imagen base para Node.js
FROM node:14

# Establece el directorio de trabajo en /app
WORKDIR /app

# Copia los archivos del proyecto al contenedor
COPY . .

# Instala las dependencias del proyecto
RUN npm ci --unsafe-perm=true

# Compila los archivos Svelte
RUN npm run build

# Expone el puerto 8080 para la aplicación
EXPOSE 8080

# Comando de inicio para ejecutar la aplicación
CMD ["npm", "run", "start"]
