# Materialize the kubeconfig the llm stack exported. Sourced by the job scripts.
# KUBECONFIG_DATA arrives as a secret environment variable, so it is masked in
# the run log; the file it lands in dies with the runner.
kube_setup() {
    : "${KUBECONFIG_DATA:?KUBECONFIG_DATA is not set}"
    KUBECONFIG="$(mktemp)"
    printf '%s' "$KUBECONFIG_DATA" > "$KUBECONFIG"
    chmod 600 "$KUBECONFIG"
    export KUBECONFIG
}
