# Oracle Database Free, prepared for a Railway volume.
#
# Railway drops literal variable values when it generates a template, so every
# literal kept as a service variable becomes an empty required field on the
# deploy form. The fixed configuration is baked into the image instead, and
# APP_USER_PASSWORD stays the one value the deployer supplies.
FROM gvenzl/oracle-free:23-slim-faststart

ENV APP_USER=mastra \
    ORACLE_RANDOM_PASSWORD=true

# The entrypoint needs root to fix the ownership of the mounted volume. It
# drops to the oracle user before it starts the database.
USER root

COPY entrypoint.sh /railway-entrypoint.sh
RUN chmod +x /railway-entrypoint.sh

ENTRYPOINT ["/railway-entrypoint.sh"]
