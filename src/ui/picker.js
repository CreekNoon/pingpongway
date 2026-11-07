// 文件选择与视频加载

/**
 * @param {HTMLInputElement} input file 输入框
 * @param {HTMLVideoElement} video
 * @param {{onLoad: Function}} callbacks 元数据就绪后回调 {name, duration, width, height}
 */
export function setupPicker(input, video, { onLoad }) {
  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    if (!file) return;

    if (video.src) URL.revokeObjectURL(video.src);
    video.src = URL.createObjectURL(file);
    video.muted = true; // 分析用，静音避免打扰

    video.addEventListener('loadedmetadata', () => {
      onLoad({
        name: file.name,
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      });
    }, { once: true });
  });
}
