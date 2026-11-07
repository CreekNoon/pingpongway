// One Euro 滤波：消除关键点逐帧抖动，同时保留快速挥拍的跟随性（纯函数，可移植服务器）

class OneEuro {
  constructor(minCutoff = 1.0, beta = 0.03, dCutoff = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
    this.xPrev = null;
    this.dxPrev = 0;
    this.tPrev = null;
  }

  alpha(cutoff, dt) {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  }

  filter(x, t) {
    if (this.xPrev === null) {
      this.xPrev = x;
      this.tPrev = t;
      return x;
    }
    const dt = Math.max(1e-3, t - this.tPrev);
    const dx = (x - this.xPrev) / dt;
    const aD = this.alpha(this.dCutoff, dt);
    const dxHat = aD * dx + (1 - aD) * this.dxPrev;
    const cutoff = this.minCutoff + this.beta * Math.abs(dxHat);
    const a = this.alpha(cutoff, dt);
    const xHat = a * x + (1 - a) * this.xPrev;
    this.xPrev = xHat;
    this.dxPrev = dxHat;
    this.tPrev = t;
    return xHat;
  }
}

/**
 * 对关键点序列做平滑。未检出的帧（keypoints 为 null）原样保留。
 * @param {Array<{t, keypoints}>} frames
 * @param {{minCutoff?, beta?, dCutoff?}} opts
 */
export function smoothFrames(frames, opts = {}) {
  const NUM_POINTS = 33;
  const filters = Array.from({ length: NUM_POINTS }, () => ({
    x: new OneEuro(opts.minCutoff, opts.beta, opts.dCutoff),
    y: new OneEuro(opts.minCutoff, opts.beta, opts.dCutoff),
    z: new OneEuro(opts.minCutoff, opts.beta, opts.dCutoff),
  }));

  return frames.map((f) => {
    if (!f.keypoints) return f;
    return {
      t: f.t,
      keypoints: f.keypoints.map((kp, i) => ({
        x: filters[i].x.filter(kp.x, f.t),
        y: filters[i].y.filter(kp.y, f.t),
        z: filters[i].z.filter(kp.z, f.t),
        v: kp.v,
      })),
    };
  });
}
