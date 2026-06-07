/** Stage 3 迪斯可舞廳背景（圖 + 燈光），遊戲與結算共用 */
export function Stage3DiscoBackdrop() {
  return (
    <>
      <div className="stage3-bg" aria-hidden />
      <div className="stage3-lights" aria-hidden>
        <div className="stage3-lights__wash" />
        <div className="stage3-lights__wash stage3-lights__wash--fast" />
        <div className="stage3-lights__beams">
          <div className="stage3-lights__beam stage3-lights__beam--a" />
          <div className="stage3-lights__beam stage3-lights__beam--b" />
          <div className="stage3-lights__beam stage3-lights__beam--c" />
          <div className="stage3-lights__beam stage3-lights__beam--d" />
          <div className="stage3-lights__beam stage3-lights__beam--e" />
        </div>
        <div className="stage3-lights__spots">
          <div className="stage3-lights__spot stage3-lights__spot--pink" />
          <div className="stage3-lights__spot stage3-lights__spot--cyan" />
          <div className="stage3-lights__spot stage3-lights__spot--gold" />
          <div className="stage3-lights__spot stage3-lights__spot--violet" />
          <div className="stage3-lights__spot stage3-lights__spot--lime" />
          <div className="stage3-lights__spot stage3-lights__spot--rose" />
        </div>
        <div className="stage3-lights__sparkles" />
        <div className="stage3-lights__sparkles stage3-lights__sparkles--alt" />
      </div>
    </>
  );
}
