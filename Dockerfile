# Imagen base para Node.js
FROM node:14

# Establece el directorio de trabajo en /app
COPY . /app

# Establece el directorio de trabajo
WORKDIR /app

# Instala las dependencias del proyecto
RUN npm install

# Compila los archivos Svelte
RUN npm run build

# Expone el puerto 5000 para la aplicación
EXPOSE 8080

# Comando de inicio para ejecutar la aplicación
CMD ["npm", "run", "start"]
