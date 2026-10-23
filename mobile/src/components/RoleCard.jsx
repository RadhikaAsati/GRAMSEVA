
export default function RoleCard({
  image,
  title,
  description,
  buttonText,
  variant,
  onClick,
}) {
  return (
    <article className={`role-card role-card--${variant}`}>
      <div className="role-card__illustration">
        <img
          src={image}
          alt=""
          className="role-card__image"
        />
      </div>

      <div className="role-card__content">
        <h2>{title}</h2>
        <p>{description}</p>

        <button
          className="role-card__button"
          type="button"
          onClick={onClick}
        >
          {buttonText}
          <span aria-hidden="true"> →</span>
        </button>
      </div>
    </article>
  )
}
