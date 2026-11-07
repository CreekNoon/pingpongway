// 集中配置：模型路径、阈值、骨架连线表（数据而非代码，方便调整）

export const CONFIG = {
  // 本地模型文件（需先下载到 assets/models/）
  modelPath: './assets/models/pose_landmarker_full.task',
  // MediaPipe tasks-vision 运行时 wasm（CDN）
  wasmBase: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm',

  numPoses: 1,            // 只跟踪画面中最主要的一个人
  minVisibility: 0.5,     // 关键点置信度阈值，低于此不参与绘制与统计

  // One Euro 滤波参数：minCutoff 越小越平滑，beta 越大快速动作跟随越好
  smooth: { minCutoff: 1.0, beta: 0.03, dCutoff: 1.0 },
};

// MediaPipe Pose 33 关键点索引（常用部分）：
// 0 鼻 | 11 左肩 12 右肩 | 13 左肘 14 右肘 | 15 左腕 16 右腕
// 23 左髋 24 右髋 | 25 左膝 26 右膝 | 27 左踝 28 右踝
// 29/30 脚跟 | 31/32 脚尖
export const SKELETON_CONNECTIONS = [
  [11, 12],           // 双肩
  [11, 13], [13, 15], // 左臂
  [12, 14], [14, 16], // 右臂
  [11, 23], [12, 24], // 躯干两侧
  [23, 24],           // 双髋
  [23, 25], [25, 27], // 左腿
  [24, 26], [26, 28], // 右腿
  [27, 29], [29, 31], [27, 31], // 左脚
  [28, 30], [30, 32], [28, 32], // 右脚
];
