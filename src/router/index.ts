import { createRouter, createWebHistory } from 'vue-router'
import FinanceManagement from "../views/finance-management.vue";
import Cart from '@/views/cart.vue'
import ProductDetail from '@/views/product-detail.vue'
function getUserRole(): string | null {
  try {
    const raw = localStorage.getItem('user')
    if (!raw) return null
    const obj = JSON.parse(raw)
    return (obj.role || '').toLowerCase() || null
  } catch { return null }
}

function roleHomePath(role: string | null): string {
  switch (role) {
    case 'admin': return '/admin-home'
    case 'expert': return '/expert-home'
    case 'bankuser': return '/financing-application'
    default: return '/home'
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: () => {
        const role = getUserRole()
        if (localStorage.getItem('auth_token') && role) return roleHomePath(role)
        return '/login'
      },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/login.vue'),
      meta: { public: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/register.vue'),
      meta: { public: true },
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('../views/forgot-password.vue'),
      meta: { public: true },
    },
    {
      path: '/home',
      name: 'home',
      component: () => import('../views/home.vue'),
      meta: { role: 'user' },
    },
    {
      path: '/admin-home',
      name: 'admin-home',
      component: () => import('../views/admin-home.vue'),
      meta: { role: 'admin' },
    },
    {
      path: '/expert-home',
      name: 'expert-home',
      component: () => import('../views/expert-home.vue'),
      meta: { role: 'expert' },
    },
    {
      path: '/bank-user-home',
      name: 'bank-user-home',
      component: () => import('../views/bank-user-home.vue'),
      meta: { role: 'bankuser' },
    },
    {
      path: '/products',
      name: 'products',
      component: () => import('../views/products.vue'),
      meta: { public: false },
    },
    {
      path: '/products/:id',
      name: 'product-detail',
      component: () => import('../views/product-detail.vue'),
      meta: { public: false },
    },
    {
      path: '/requests',
      name: 'requests',
      component: () => import('../views/requests.vue'),
    },

    {
      path: '/cart',
      name: 'cart',
      component: () => import('../views/cart.vue'),
    },
    {
      path: '/delivery-address',
      name: 'delivery-address',
      component: () => import('../views/delivery-address.vue'),
    },
    {
      path: '/bank-user-match', // 访问该页面的URL路径（可自定义）
      name: 'BankUserMatch',
      component: () => import('@/views/bank-user-match.vue'),
      meta: { title: '银行用户匹配' }
    },
    {
      path: '/financing-application', // 与导航组件中的to属性完全匹配
      name: 'FinancingApplication',
      component: () => import('../views/financing-application.vue'), // 对应你的融资申请管理页面组件
      meta: {
        role: 'bankuser', // 根据业务需求设置角色权限，比如只有银行用户可访问
        title: '融资申请管理'
      }
    },
    {
      path: '/orders',
      name: 'orders',
      component: () => import('../views/order_manage.vue'),
    },
    {
      path: '/finance',
      name: 'finance',
      component: () => import('../views/finance.vue'),
    },
    {
      path: '/finance-management',
      name: 'financeManagement',
      component: FinanceManagement
    },
    {
      path: '/knowledge',
      name: 'knowledgeList',
      component: () => import('../views/homeKnowledge.vue'),
      meta: { title: '农业知识列表' }
    },
    {
      path: '/knowledge/:id', // 必须包含`:id`占位符，接收跳转时的参数
      component: () => import('../views/knowledgeDetail.vue'),
      props: true,
      meta: { title: '农业知识详情' }
    },
    {
      path: '/publish-knowledge',
      name: 'PublishKnowledge',
      component: () => import('../views/publishKnowledge.vue'),
      meta: {
        title: '新增农业知识' ,
        requireAuth: true, // 需登录才能访问（若有登录拦截器）
        role: 'expert' // 根据业务需求设置角色权限，比如只有专家可访问
      }
    },
    {
      path: '/questionHome',
      name: 'questionHome',
      component:  () => import('../views/question-home.vue'),
      props: true,
      meta: {
        title: '专家列表' ,
        requireAuth: true, // 需登录才能访问（若有登录拦截器）
        role: 'expert' | 'User'// 根据业务需求设置角色权限，比如只有专家可访问
      }
    },
    {
      path: '/appointExpert',
      name: 'appointExpert',
      component: () => import('../views/appointExpert.vue'),
      meta: {
        title: '线下预约专家',
        requireAuth: true, // 需登录才能访问（若有登录拦截器）
      }
    },
    {
      path: '/myAppointment',
      name: 'myAppointment',
      component: () => import('../views/myAppointment.vue'),
      meta: {
        title: '查看个人预约记录',
        requireAuth: true, // 需登录才能访问（若有登录拦截器）
      }
    },
    {
      path: '/E_Appointment',
      name: 'expertAppointment',
      component: () => import('../views/expertAppointmentDetail.vue'),
      meta: {
        title: '查看个人预约记录',
        requireAuth: true, // 需登录才能访问（若有登录拦截器）
      }
    },
    {
      path: '/addQuestion',
      name: 'addQuestion',
      component: () => import('../views/addQuestion.vue'),
      meta: {
        title: '新增问答'
      }
    },
    {
      path: '/guide/:id',
      component: () => import('../views/guideDetail.vue'),
      meta: { title: '问答详情' }
    },
    {
      path: '/questionManage',
      name: 'QuestionManage',
      component: () => import('../views/questionManage.vue'),
      meta: {
        title: '问答管理',
        requireAuth: true, // 需登录才能访问（若有登录拦截器）
        role: 'expert'|'User'
      }
    },
    { path: '/cart',
      name: 'Cart',
      component: Cart
    },
    { path: '/product/:id',
      name: 'ProductDetail',
      component: ProductDetail
    }


  ],
})
router.beforeEach((to, from, next) => {
  const isPublic = to.meta.public === true
  const token = localStorage.getItem('auth_token')
  const role = getUserRole()
  if (isPublic) return next()
  if (!token) {
    // 未登录访问受保护页面 -> 登录
    return next({ path: '/login', query: { needLogin: 'true' } })
  }
  const needRole = (to.meta.role || '') as string
  if (needRole && needRole !== role) {
    // 角色不匹配，跳回自己的首页
    return next(roleHomePath(role))
  }
  next()
})

export default router
