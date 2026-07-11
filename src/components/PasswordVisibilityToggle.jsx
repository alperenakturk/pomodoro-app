// Shared by AuthModal.jsx and ChangePasswordModal.jsx (both have one or more
// password fields that need independent show/hide state) — extracted here
// rather than duplicated so there's exactly one eye icon/toggle to maintain.
//
// Absolutely positioned inside a `relative`-wrapped input wrapper by the
// caller — toggles the sibling input between type="password"/"text" via the
// `visible` state the caller owns, so multiple password fields on the same
// form can be shown/hidden independently.
function PasswordVisibilityToggle({ visible, onToggle, t }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      tabIndex={-1}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-sage hover:text-cream"
      aria-label={visible ? t('auth.hidePasswordAria') : t('auth.showPasswordAria')}
    >
      {visible ? <EyeOffIcon /> : <EyeIcon />}
    </button>
  )
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path
        d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path
        d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.24 4.24M9.17 5.24A10.7 10.7 0 0 1 12 5c7 0 10.5 7 10.5 7a13.3 13.3 0 0 1-3.05 3.9M6.5 6.66C3.87 8.4 1.5 12 1.5 12a13.3 13.3 0 0 0 5.06 5.44A10.6 10.6 0 0 0 12 19"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default PasswordVisibilityToggle
