{{- define "forkwise-frontend.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "forkwise-frontend.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name (include "forkwise-frontend.name" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{- define "forkwise-frontend.labels" -}}
app.kubernetes.io/name: {{ include "forkwise-frontend.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
tier: frontend
{{- end -}}

{{- define "forkwise-frontend.selectorLabels" -}}
app.kubernetes.io/name: {{ include "forkwise-frontend.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}
