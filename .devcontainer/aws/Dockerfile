FROM ghcr.io/pulumi/devcontainer:extra

##################################################################################
# Install AWS CLI v2

USER root
RUN echo \
    && export ARCH=$(uname -m | awk '{ if ($1 == "x86_64") print "x86_64"; else if ($1 == "aarch64" || $1 == "arm64") print "aarch64"; else print "unknown" }') \
    && export NAME="aws" \
    && export TEST="${NAME} --version" \
    && export PKG="awscli-exe-linux-${ARCH}.zip" \
    && export URL="https://awscli.amazonaws.com/${PKG}" \
    && export DIR="/tmp/awscli" \
    && echo "---------------------------------------------------------"\
    && echo "INFO[${NAME}] Installed:" \
    && echo "INFO[${NAME}]   Command:        ${NAME}" \
    && echo "INFO[${NAME}]   Package:        ${PKG}" \
    && echo "INFO[${NAME}]   Architecture:   ${ARCH}" \
    && echo "INFO[${NAME}]   Source:         ${URL}" \
    && echo "---------------------------------------------------------"\
    && mkdir -p ${DIR} \
    && ${curl} ${URL} --output ${DIR}/${PKG} \
    && unzip ${DIR}/${PKG} -d ${DIR} \
    && bash -c "${DIR}/aws/install" \
    && ${dir_clean} \
    && ${TEST} \
    && echo
USER vscode
