FROM ghcr.io/pulumi/devcontainer:extra

##################################################################################
# Install Google Cloud SDK

ENV CLOUDSDK_INSTALL_DIR /usr/local/gcloud/
ENV PATH $PATH:/usr/local/gcloud/google-cloud-sdk/bin

USER root
RUN echo \
    && export ARCH=$(uname -m | awk '{ if ($1 == "x86_64") print "amd64"; else if ($1 == "aarch64" || $1 == "arm64") print "arm64"; else print "unknown" }') \
    && export NAME="gcloud" \
    && export TEST="${NAME} version" \
    && export PKG="google-cloud-sdk.tar.gz" \
    && export URL="https://dl.google.com/dl/cloudsdk/release/${PKG}" \
    && export DIR="/usr/local/gcloud" \
    && echo "---------------------------------------------------------"\
    && echo "INFO[${NAME}] Installed:" \
    && echo "INFO[${NAME}]   Command:        ${NAME}" \
    && echo "INFO[${NAME}]   Package:        ${PKG}" \
    && echo "INFO[${NAME}]   Architecture:   ${ARCH}" \
    && echo "INFO[${NAME}]   Source:         ${URL}" \
    && echo "---------------------------------------------------------"\
    && mkdir -p ${DIR} \
    && ${curl} ${URL} | tar xzvf - --directory ${DIR} \
    && /usr/local/gcloud/google-cloud-sdk/install.sh -q \
    && ${dir_clean} \
    && ${TEST} \
    && echo
USER vscode