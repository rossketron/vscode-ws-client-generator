FROM websphere-liberty AS liberty
FROM ibmjava8:ubi-sdk
COPY --from=liberty /opt/ibm/wlp /opt/ibm/wlp
USER root
RUN mkdir -p /usr/tmp/binding
RUN chown 1001 /usr/tmp
RUN chown 1001 /usr/tmp/binding
USER 1001
RUN /bin/bash
