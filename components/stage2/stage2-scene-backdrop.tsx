/** Stage 2 和室背景（圖 + 燈光／霧），遊戲／開場／結算共用 */
export function Stage2SceneBackdrop() {
  return (
    <>
      <div className="stage2-scene-bg" aria-hidden />
      <div className="stage2-scene-lights" aria-hidden>
        <div className="stage2-scene-lights__wash" />
        <div className="stage2-scene-lights__lanterns">
          <div className="stage2-scene-lights__lantern stage2-scene-lights__lantern--left" />
          <div className="stage2-scene-lights__lantern stage2-scene-lights__lantern--right" />
        </div>
        <div className="stage2-scene-lights__mist" />
        <div className="stage2-scene-lights__vignette" />
        <div className="stage2-scene-lights__sparkles" />
      </div>
    </>
  );
}
