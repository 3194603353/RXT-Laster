
export interface ApiResponse<T> {
  code: number;
  msg: string;
  data: T;
}

// 分页响应通用类型（适配后端分页返回 { records, total, pageNum, pageSize } 结构）
export interface PageResponse<T> {
  records: T[]; // 列表数据
  total: number; // 总条数
  pageNum: number; // 当前页码
  pageSize: number; // 每页条数
}

// 农业知识类型（对应列表页/详情页的知识数据）
export interface Knowledge {
  knowledgeId: number; // 知识ID（可能为null，需兼容）
  title: string; // 标题
  content: string; // 内容
  picPath: string | null; // 图片路径（可能为null）
  ownName: string | null; // 发布者名称（可能为null）
  createTime: string | null; // 发布时间（可能为null，后端返回字符串格式时间）
  updateTime: string | null; // 更新时间（可能为null）
  category: string | null;
}

// 评论/讨论类型（对应知识详情页的评论数据）
export interface Discuss {
  discussId: number ; // 评论ID（可能为null）
  knowledgeId: number ; // 关联的知识ID（可能为null）
  ownName: string ; // 评论者名称（可能为null）
  content: string ; // 评论内容（可能为null）
  createTime: string ; // 评论时间（可能为null）
  updateTime: string ; // 更新时间（可能为null）
}

// （可选）如果有专家/问题相关类型，补充之前提到的接口
export interface Expert {
  userName: string ;
  realName: string ;
  phone: string ;
  profession: string ;
  position: string ;
  belong: string ;
}

export interface Question {
  questionId: number ;
  expertName: string ;
  questioner:string;
  phone:string;
  plantName:string;
  title: string ;
  question: string ;
  answer : string ;
  status: string ;
  createTime: string ;
  updateTime: string ;
  rejectReason: string ; // 拒绝理由（可能为null）
}
  export interface User {
    userName: string ;
    password: string ;
    nickName: string ;
    phone: string ;
    identityNum: number ;
    address: string ;
    role:string;
    createTime: string ;
    updateTime: string ;
    integral: string ;
    credit: string ;
    avatar: string ;
    realName:string;
}
// 新增：专家详情VO（合并 User + Expert 展示字段）
export interface ExpertDetailVO {
  userName: string;       // 用户名（主键）
  realName: string;       // 真实姓名（优先取User表）
  phone: string;          // 电话
  profession: string;     // 专业（Expert表）
  position: string;       // 职位（Expert表）
  belong: string;         // 所属机构（Expert表）
  avatar: string;         // 头像（User表）
  nickName?: string;      // 昵称（User表，可选）
  credit?: string;        // 信用分（User表，可选）
}

