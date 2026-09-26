{{- define "forkwise-backend.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "forkwise-backend.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name (include "forkwise-backend.name" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{- define "forkwise-backend.labels" -}}
app.kubernetes.io/name: {{ include "forkwise-backend.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
tier: backend
{{- end -}}

{{- define "forkwise-backend.selectorLabels" -}}
app.kubernetes.io/name: {{ include "forkwise-backend.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{- define "forkwise-backend.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
{{- default (include "forkwise-backend.fullname" .) .Values.serviceAccount.name -}}
{{- else -}}
{{- default "default" .Values.serviceAccount.name -}}
{{- end -}}
{{- end -}}

{{- define "forkwise-backend.secretName" -}}
{{- if .Values.secret.existingSecret -}}
{{- .Values.secret.existingSecret -}}
{{- else -}}
{{- printf "%s-secret" (include "forkwise-backend.fullname" .) -}}
{{- end -}}
{{- end -}}
