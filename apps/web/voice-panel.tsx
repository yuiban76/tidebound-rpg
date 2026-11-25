import { useId } from 'react'
import type { Narrator } from './voice.ts'
import './voice-panel.css'

/** Turns the storyteller on and off, with its settings while it is on. */
export function VoiceSwitch({ voice }: { voice: Narrator }) {
  return <label className="check" title={voice.supported ? undefined : '這個瀏覽器沒有語音功能'}>
    <input type="checkbox" checked={voice.settings.on} disabled={!voice.supported} onChange={e => voice.change({ on: e.target.checked })}/> 語音說故事</label>
}

export function VoiceSettingsPanel({ voice }: { voice: Narrator }) {
  const id = useId()
  const { settings, voices } = voice
  if (!settings.on) return null
  return <div className="voice-settings" role="group" aria-label="語音設定">
    {voices.length === 0 && <p className="hint">這台裝置沒有中文語音，會用預設聲音試著唸。Windows 可以到「設定 › 時間與語言 › 語音」加裝中文語音。</p>}
    <div className="voice-fields">
      <label htmlFor={id + 'v'}>旁白的聲音</label>
      <select id={id + 'v'} value={voices.some(one => one.voiceURI === settings.voice) ? settings.voice : voices[0]?.voiceURI ?? ''} onChange={e => voice.change({ voice: e.target.value })} disabled={!voices.length}>
        {voices.map(one => <option key={one.voiceURI} value={one.voiceURI}>{one.name.replace(/^Microsoft /, '').replace(/ - Chinese.*$/, '')}（{one.lang}{one.localService ? '' : '，線上'}）</option>)}
      </select>
      <label htmlFor={id + 'r'}>語速 {settings.rate.toFixed(1)}</label>
      <input id={id + 'r'} type="range" min={.6} max={1.8} step={.1} value={settings.rate} onChange={e => voice.change({ rate: Number(e.target.value) })}/>
      <label htmlFor={id + 'l'}>音量 {Math.round(settings.volume * 100)}%</label>
      <input id={id + 'l'} type="range" min={0} max={1} step={.05} value={settings.volume} onChange={e => voice.change({ volume: Number(e.target.value) })}/>
    </div>
    <div className="button-row">
      <label className="check"><input type="checkbox" checked={settings.cast} onChange={e => voice.change({ cast: e.target.checked })}/> 角色分聲音</label>
      <label className="check"><input type="checkbox" checked={settings.world} onChange={e => voice.change({ world: e.target.checked })}/> 唸世界公告與報紙</label>
      <button type="button" className="light" onClick={voice.sample}>試聽</button>
    </div>
  </div>
}

/** What is being read, with the controls that matter while listening. */
export function VoiceBar({ voice }: { voice: Narrator }) {
  if (voice.blocked) return <p className="voice-bar" role="status">聲音沒有播出來。按一下「試聽」，或在「動畫與語音」換一個聲音。
    <button type="button" className="light" onClick={voice.sample}>試聽</button></p>
  if (!voice.now && !voice.waiting) return null
  return <div className="voice-bar" role="group" aria-label="語音播放">
    <span className="voice-now"><i aria-hidden="true"/>{voice.now?.who ?? '旁白'}</span>
    <button type="button" className="light" onClick={() => voice.pause(!voice.paused)}>{voice.paused ? '繼續' : '暫停'}</button>
    <button type="button" className="light" onClick={voice.skip}>跳過這句</button>
    <button type="button" className="light" onClick={voice.stop}>停止</button>
  </div>
}
