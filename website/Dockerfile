# ============================================================
#  Kamal Muhamed Ahmed — Voice AI Engineer Portfolio
#  Static site served by nginx, ready for Google Cloud Run.
# ============================================================
FROM nginx:1.27-alpine

LABEL org.opencontainers.image.title="Voice AI Engineer Portfolio" \
      org.opencontainers.image.authors="Kamal Muhamed Ahmed"

# Remove the stock default site (we generate ours from a template).
RUN rm -f /etc/nginx/conf.d/default.conf

# The official nginx image runs envsubst on files in /etc/nginx/templates
# at startup, writing the result into /etc/nginx/conf.d/. This lets us
# inject the $PORT that Cloud Run provides at runtime.
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template

# Copy the static site.
COPY public/ /usr/share/nginx/html/

# Cloud Run injects PORT (default 8080); provide a sane local default too.
ENV PORT=8080
EXPOSE 8080

# Base image's entrypoint handles envsubst + launches nginx in the foreground.
CMD ["nginx", "-g", "daemon off;"]
