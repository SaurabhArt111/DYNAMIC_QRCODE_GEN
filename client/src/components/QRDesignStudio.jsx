import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Circle, Palette, RotateCcw, Save, Smartphone, Square, Trash2, UploadCloud, X } from 'lucide-react';
import Modal from './Modal.jsx';
import QRCanvas from './QRCanvas.jsx';
import { api, getErrorMessage } from '../api/http.js';
import {
  COLOR_SWATCHES, CORNER_PRESETS, DOT_TYPES, FRAME_STYLES, FRAME_STYLES_WITH_TEXT, resolveEffectiveDesign
} from '../utils/qrEngine.js';
import { loadAuthenticatedImage, resolveDesignAndLogoUrl } from '../utils/designHelpers.js';
import './QRDesignStudio.css';

// Short sample text used for every preset swatch preview so the pattern /
// corner / frame shape reads clearly at a glance (the real vault URL is only
// used for the one big "your QR" preview on the left).
const SWATCH_SAMPLE_DATA = 'DESIGN-PREVIEW';

function LogoThumb({ file, path }) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let revoke = () => {};

    async function run() {
      if (file) {
        const objectUrl = URL.createObjectURL(file);
        if (!cancelled) setSrc(objectUrl);
        revoke = () => URL.revokeObjectURL(objectUrl);
        return;
      }
      if (path) {
        try {
          const { image, revoke: revokeFn } = await loadAuthenticatedImage(path);
          revoke = revokeFn;
          if (!cancelled) setSrc(image?.src || null);
        } catch {
          if (!cancelled) setSrc(null);
        }
        return;
      }
      setSrc(null);
    }

    run();
    return () => { cancelled = true; revoke(); };
  }, [file, path]);

  if (!src) return <UploadCloud size={22} />;
  return <img src={src} alt="Logo preview" />;
}

function ColorRow({ label, value, onChange }) {
  return (
    <div className="qds-color-row">
      <span className="qds-field-label">{label}</span>
      <div className="qds-swatches">
        {COLOR_SWATCHES.map((swatch) => (
          <button
            key={swatch}
            type="button"
            className={`qds-swatch${value?.toUpperCase() === swatch ? ' is-active' : ''}`}
            style={{ background: swatch, borderColor: swatch === '#FFFFFF' ? 'var(--border)' : 'transparent' }}
            onClick={() => onChange(swatch)}
            aria-label={swatch}
          >
            {value?.toUpperCase() === swatch && <Check size={14} color={swatch === '#FFFFFF' ? '#17202A' : '#fff'} />}
          </button>
        ))}
        <label className="qds-swatch qds-swatch-custom" style={{ background: value || '#fff' }}>
          <Palette size={14} />
          <input type="color" value={value || '#000000'} onChange={(event) => onChange(event.target.value)} />
        </label>
      </div>
    </div>
  );
}

export default function QRDesignStudio({ scope, qr, collection, onClose, onSaved }) {
  const isQrScope = scope === 'qr';

  const initialDesign = useMemo(() => {
    if (isQrScope) {
      const { design } = resolveDesignAndLogoUrl(qr, collection?.design);
      return design;
    }
    return resolveEffectiveDesign(null, collection?.design, true);
  }, [isQrScope, qr, collection]);

  const initialLogoPath = useMemo(() => {
    if (isQrScope) return resolveDesignAndLogoUrl(qr, collection?.design).logoPath;
    return collection?.design?.logo ? `/collections/${collection._id}/design/logo` : null;
  }, [isQrScope, qr, collection]);

  const [design, setDesign] = useState(initialDesign);
  const [activeTab, setActiveTab] = useState('frame');
  const [logoFile, setLogoFile] = useState(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const previewVaultUrl = isQrScope ? qr?.vaultUrl : `${window.location.origin}/vault/sample-qr-code`;

  const [localLogoObjectUrl, setLocalLogoObjectUrl] = useState(null);
  useEffect(() => {
    if (!logoFile) { setLocalLogoObjectUrl(null); return undefined; }
    const url = URL.createObjectURL(logoFile);
    setLocalLogoObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  const effectiveLogoPath = removeLogo ? null : (localLogoObjectUrl || initialLogoPath);

  function updateDesign(patch) {
    setDesign((prev) => ({ ...prev, ...patch }));
  }

  function handleLogoPick(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setRemoveLogo(false);
  }

  function handleRemoveLogo() {
    setLogoFile(null);
    setRemoveLogo(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const basePath = isQrScope ? `/qrcodes/${qr._id}` : `/collections/${collection._id}`;
      const { logo, ...designPayload } = design;
      await api.put(`${basePath}/design`, designPayload);

      if (logoFile) {
        const formData = new FormData();
        formData.append('logo', logoFile);
        await api.post(`${basePath}/design/logo`, formData);
      } else if (removeLogo) {
        await api.delete(`${basePath}/design/logo`).catch(() => {});
      }

      await onSaved?.();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleResetToCollection() {
    setResetting(true);
    setError('');
    try {
      await api.delete(`/qrcodes/${qr._id}/design`);
      await onSaved?.();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setResetting(false);
    }
  }

  const showResetOption = isQrScope && !!qr?.collectionId;

  return (
    <Modal
      title={isQrScope ? `Design "${qr?.name}"` : `Design frame for "${collection?.name}"`}
      onClose={onClose}
      wide
    >
      {!isQrScope && (
        <p className="qds-scope-note">
          This look applies to every QR code in this collection that hasn't been given its own custom
          design. Downloading the collection as a ZIP or PDF will use this design for all of them.
        </p>
      )}
      {isQrScope && qr?.collectionId && !qr?.useCustomDesign && (
        <p className="qds-scope-note">
          This QR is currently following <strong>{collection?.name}</strong>'s collection design. Making
          changes below gives it its own custom look.
        </p>
      )}

      <div className="qds-layout">
        <div className="qds-preview">
          <div className="qds-preview-canvas">
            <QRCanvas data={previewVaultUrl} design={design} logoPath={effectiveLogoPath} qrPixelSize={520} />
          </div>
          {showResetOption && (
            <button className="secondary-button qds-reset-button" onClick={handleResetToCollection} disabled={resetting || saving}>
              <RotateCcw size={16} /> {resetting ? 'Resetting…' : 'Use collection design instead'}
            </button>
          )}
        </div>

        <div className="qds-editor">
          <div className="qds-tabs">
            <button className={`qds-tab${activeTab === 'frame' ? ' is-active' : ''}`} onClick={() => setActiveTab('frame')}>
              <Smartphone size={16} /> Frame
            </button>
            <button className={`qds-tab${activeTab === 'shape' ? ' is-active' : ''}`} onClick={() => setActiveTab('shape')}>
              <Square size={16} /> Shape
            </button>
            <button className={`qds-tab${activeTab === 'logo' ? ' is-active' : ''}`} onClick={() => setActiveTab('logo')}>
              <Circle size={16} /> Logo
            </button>
          </div>

          <div className="qds-tab-panel">
            {activeTab === 'frame' && (
              <div className="qds-section">
                <span className="qds-field-label">Frame style</span>
                <div className="qds-grid qds-grid-frames">
                  {FRAME_STYLES.map((frame) => (
                    <button
                      key={frame.id}
                      type="button"
                      className={`qds-preset${design.frameStyle === frame.id ? ' is-active' : ''}`}
                      onClick={() => updateDesign({ frameStyle: frame.id })}
                      title={frame.label}
                    >
                      <QRCanvas
                        data={SWATCH_SAMPLE_DATA}
                        design={{ ...design, frameStyle: frame.id }}
                        qrPixelSize={160}
                      />
                      <span>{frame.label}</span>
                    </button>
                  ))}
                </div>

                {FRAME_STYLES_WITH_TEXT.has(design.frameStyle) && (
                  <>
                    <div className="field">
                      <label>Caption text</label>
                      <input
                        type="text"
                        maxLength={20}
                        value={design.frameText || ''}
                        onChange={(event) => updateDesign({ frameText: event.target.value })}
                        placeholder="SCAN ME!"
                      />
                    </div>
                    <ColorRow label="Frame color" value={design.frameColor} onChange={(frameColor) => updateDesign({ frameColor })} />
                    <ColorRow label="Text color" value={design.frameTextColor} onChange={(frameTextColor) => updateDesign({ frameTextColor })} />
                  </>
                )}
              </div>
            )}

            {activeTab === 'shape' && (
              <div className="qds-section">
                <span className="qds-field-label">Patterns</span>
                <div className="qds-grid qds-grid-shapes">
                  {DOT_TYPES.map((dot) => (
                    <button
                      key={dot.id}
                      type="button"
                      className={`qds-preset${design.dotsType === dot.id ? ' is-active' : ''}`}
                      onClick={() => updateDesign({ dotsType: dot.id })}
                      title={dot.label}
                    >
                      <QRCanvas
                        data={SWATCH_SAMPLE_DATA}
                        design={{ ...design, dotsType: dot.id, frameStyle: 'none' }}
                        qrPixelSize={140}
                      />
                    </button>
                  ))}
                </div>

                <span className="qds-field-label">Corners</span>
                <div className="qds-grid qds-grid-shapes">
                  {CORNER_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className={`qds-preset${design.cornersSquareType === preset.square && design.cornersDotType === preset.dot ? ' is-active' : ''}`}
                      onClick={() => updateDesign({ cornersSquareType: preset.square, cornersDotType: preset.dot })}
                      title={preset.label}
                    >
                      <QRCanvas
                        data={SWATCH_SAMPLE_DATA}
                        design={{ ...design, cornersSquareType: preset.square, cornersDotType: preset.dot, frameStyle: 'none' }}
                        qrPixelSize={140}
                      />
                    </button>
                  ))}
                </div>

                <ColorRow label="Code color" value={design.dotsColor} onChange={(dotsColor) => updateDesign({ dotsColor })} />
                <ColorRow label="Background color" value={design.backgroundColor} onChange={(backgroundColor) => updateDesign({ backgroundColor })} />
              </div>
            )}

            {activeTab === 'logo' && (
              <div className="qds-section">
                <span className="qds-field-label">Logo</span>
                <div className="qds-logo-row">
                  <div className="qds-logo-preview">
                    {removeLogo ? <UploadCloud size={22} /> : <LogoThumb file={logoFile} path={initialLogoPath} />}
                  </div>
                  <div className="qds-logo-actions">
                    <button type="button" className="secondary-button" onClick={() => fileInputRef.current?.click()}>
                      <UploadCloud size={16} /> {effectiveLogoPath ? 'Replace logo' : 'Upload logo'}
                    </button>
                    {effectiveLogoPath && (
                      <button type="button" className="danger-button" onClick={handleRemoveLogo}>
                        <Trash2 size={16} /> Remove
                      </button>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleLogoPick} />
                  </div>
                </div>

                <div className="qds-range-field">
                  <span className="qds-field-label">Logo size ({Math.round((design.logoSize || 0.22) * 100)}%)</span>
                  <input
                    type="range"
                    min="0.1"
                    max="0.35"
                    step="0.01"
                    value={design.logoSize || 0.22}
                    onChange={(event) => updateDesign({ logoSize: Number(event.target.value) })}
                  />
                </div>

                <label className="qds-checkbox">
                  <input
                    type="checkbox"
                    checked={design.hideBackgroundDots !== false}
                    onChange={(event) => updateDesign({ hideBackgroundDots: event.target.checked })}
                  />
                  Clear background dots behind the logo
                </label>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="qds-footer">
        <button className="secondary-button" onClick={onClose} disabled={saving}><X size={16} /> Cancel</button>
        <button className="primary-button" onClick={handleSave} disabled={saving}>
          <Save size={16} /> {saving ? 'Saving…' : (isQrScope ? 'Save design' : 'Save collection design')}
        </button>
      </div>
    </Modal>
  );
}
