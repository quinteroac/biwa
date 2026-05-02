import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchStudioSettings, saveStudioSettings } from './api.ts'
import { StudioIcon } from './StudioIcon.tsx'
import type { StudioProjectSummary, StudioSettings as StudioSettingsModel } from '../../shared/types.ts'

const qualityOptions = ['low', 'medium', 'high', 'auto'] as const
const formatOptions = ['png', 'webp', 'jpeg'] as const
const moderationOptions = ['auto', 'low'] as const
const characterSheetResolutionOptions = ['1024x1536', '1024x1024', '1536x1024', 'auto'] as const

export function StudioSettings(props: {
  project: StudioProjectSummary
  onRunDoctor: () => void
  isRunningDoctor: boolean
}) {
  const queryClient = useQueryClient()
  const settingsQuery = useQuery({
    queryKey: ['studio-settings', props.project.id],
    queryFn: () => fetchStudioSettings(props.project.id),
  })
  const [draft, setDraft] = useState<StudioSettingsModel | null>(null)
  const saveMutation = useMutation({
    mutationFn: () => saveStudioSettings(props.project.id, draft as StudioSettingsModel),
    onSuccess: async data => {
      setDraft(data.settings)
      await queryClient.invalidateQueries({ queryKey: ['studio-settings', props.project.id] })
    },
  })

  useEffect(() => {
    if (settingsQuery.data?.settings) setDraft(settingsQuery.data.settings)
  }, [settingsQuery.data])

  const openaiImages = draft?.openaiImages ?? null

  return (
    <div className="settings-workspace">
      <section className="settings-panel settings-openai-panel">
        <div className="settings-panel-heading">
          <div>
            <strong><StudioIcon name="settings" size={17} /> OpenAI Images</strong>
            <span>{openaiImages?.apiKeyConfigured ? 'API key configured' : 'API key missing'}</span>
          </div>
          <button
            className="ghost-button"
            disabled={!draft || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
            type="button"
          >
            {saveMutation.isPending ? 'Saving' : 'Save Settings'}
          </button>
        </div>

        {settingsQuery.isLoading ? (
          <p className="muted">Loading settings.</p>
        ) : settingsQuery.isError ? (
          <p className="form-error">{settingsQuery.error.message}</p>
        ) : openaiImages ? (
          <div className="settings-form-grid">
            <label className="settings-field is-wide">
              <span>API Key</span>
              <input
                autoComplete="off"
                onChange={event => setDraft({ ...draft, openaiImages: { ...openaiImages, apiKey: event.target.value } })}
                placeholder={openaiImages.apiKeyConfigured ? 'Configured. Enter a new key to replace it.' : 'sk-...'}
                type="password"
                value={openaiImages.apiKey}
              />
            </label>
            <label className="settings-field">
              <span>Base URL</span>
              <input
                onChange={event => setDraft({ ...draft, openaiImages: { ...openaiImages, baseUrl: event.target.value } })}
                value={openaiImages.baseUrl}
              />
            </label>
            <label className="settings-field">
              <span>Generation URL</span>
              <input
                onChange={event => setDraft({ ...draft, openaiImages: { ...openaiImages, imageGenerationPath: event.target.value } })}
                value={openaiImages.imageGenerationPath}
              />
            </label>
            <label className="settings-field">
              <span>Model</span>
              <input
                onChange={event => setDraft({ ...draft, openaiImages: { ...openaiImages, model: event.target.value } })}
                value={openaiImages.model}
              />
            </label>
            <label className="settings-field">
              <span>Quality</span>
              <select
                onChange={event => setDraft({ ...draft, openaiImages: { ...openaiImages, quality: event.target.value as typeof qualityOptions[number] } })}
                value={openaiImages.quality}
              >
                {qualityOptions.map(quality => <option key={quality} value={quality}>{quality}</option>)}
              </select>
            </label>
            <label className="settings-field">
              <span>Output Format</span>
              <select
                onChange={event => setDraft({ ...draft, openaiImages: { ...openaiImages, outputFormat: event.target.value as typeof formatOptions[number] } })}
                value={openaiImages.outputFormat}
              >
                {formatOptions.map(format => <option key={format} value={format}>{format}</option>)}
              </select>
            </label>
            <label className="settings-field">
              <span>Moderation</span>
              <select
                onChange={event => setDraft({ ...draft, openaiImages: { ...openaiImages, moderation: event.target.value as typeof moderationOptions[number] } })}
                value={openaiImages.moderation}
              >
                {moderationOptions.map(moderation => <option key={moderation} value={moderation}>{moderation}</option>)}
              </select>
            </label>
            <label className="settings-field">
              <span>Character Sheet Resolution</span>
              <select
                onChange={event => setDraft({ ...draft, openaiImages: { ...openaiImages, characterSheetResolution: event.target.value as typeof characterSheetResolutionOptions[number] } })}
                value={openaiImages.characterSheetResolution}
              >
                {characterSheetResolutionOptions.map(resolution => <option key={resolution} value={resolution}>{resolution}</option>)}
              </select>
            </label>
            <label className="settings-field">
              <span>Remove Spritesheet Background</span>
              <input
                checked={openaiImages.spritesheetBackgroundRemovalEnabled}
                onChange={event => setDraft({ ...draft, openaiImages: { ...openaiImages, spritesheetBackgroundRemovalEnabled: event.target.checked } })}
                type="checkbox"
              />
            </label>
            <label className="settings-field">
              <span>Background Removal Timeout Seconds</span>
              <input
                disabled={!openaiImages.spritesheetBackgroundRemovalEnabled}
                max={1800}
                min={30}
                onChange={event => setDraft({ ...draft, openaiImages: { ...openaiImages, spritesheetBackgroundRemovalTimeoutSeconds: Number(event.target.value) } })}
                type="number"
                value={openaiImages.spritesheetBackgroundRemovalTimeoutSeconds}
              />
            </label>
            <label className="settings-field">
              <span>Generation Timeout Seconds</span>
              <input
                max={600}
                min={30}
                onChange={event => setDraft({ ...draft, openaiImages: { ...openaiImages, imageGenerationTimeoutSeconds: Number(event.target.value) } })}
                type="number"
                value={openaiImages.imageGenerationTimeoutSeconds}
              />
            </label>
          </div>
        ) : null}

        {saveMutation.isError ? <p className="form-error">{saveMutation.error.message}</p> : null}
      </section>
    </div>
  )
}
