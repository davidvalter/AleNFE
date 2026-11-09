// ecosystem.config.js

module.exports = {
  apps: [
    {
      name: "alenfe-sefaz",
      script: "dist/server.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",

      env: {
        NODE_ENV: "production",
        NODE_EXTRA_CA_CERTS: "/etc/ssl/certs/ca-certificates.crt"
      }
    }
  ]
};