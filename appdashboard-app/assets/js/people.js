import {users,person} from './domain/domain.js';
import {escape as e} from './html.js';
// Original template demo images; these are placeholders, not actual member photos.
export function avatarPath(id){const index=users.findIndex(u=>u.id===id);return index<=0?'assets/img/profile-img.webp':`assets/img/avatars/avatar-${index}.webp`;}
export function memberIdentity(id){const user=users.find(u=>u.id===id);return `<div class="page-users"><div class="users-person"><img src="${avatarPath(id)}" alt="${e(person(id))}的示例头像"><div><strong>${e(person(id))}</strong><span>${e(user?.orgRole||'组织成员')}</span></div></div></div>`;}
