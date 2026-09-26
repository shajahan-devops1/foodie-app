{{- define "food-delivery.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- define "food-delivery.fullname" -}}
{{- printf "%s-%s" .Release.Name (include "food-delivery.name" .) | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- define "food-delivery.labels" -}}
app.kubernetes.io/name: {{ include "food-delivery.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}