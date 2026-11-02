import {read,write} from './store.js';

// Local demo memberships. Production memberships must come from the signed-in user's API.
export const organizations = [
 {id:'east',name:'数据研发部',description:'数据接入、开发与治理',members:['zhang','li','wang','chen','zhou','liu'],admins:['zhang'],creators:['zhang','li']},
 {id:'operations',name:'业务运营部',description:'业务分析与运营协作',members:['zhang','li','zhou'],admins:['li'],creators:['li','zhang']}
];
const userId=()=>new URLSearchParams(location.search).get('as')||'zhang';
export const joinedOrganizations=(id=userId())=>organizations.filter(org=>org.members.includes(id));
export function activeOrganization(){
 const joined=joinedOrganizations(),saved=read('mingce.appdashboard.active-org.v1.'+userId(),null);
 return joined.find(org=>org.id===saved)||joined[0]||null;
}
export function selectOrganization(id){
 const org=joinedOrganizations().find(org=>org.id===id);
 if(!org)throw Error('你尚未加入此组织，无法切换');
 write('mingce.appdashboard.active-org.v1.'+userId(),org.id);
 return org;
}
export const organizationRole=(id=userId(),org=activeOrganization())=>org?.members.includes(id)?(org.admins.includes(id)?'组织管理员':'组织成员'):'非组织成员';
// Existing unscoped demo projects belong to the original organization.
export const projectOrganizationId=project=>project.organizationId||(project.organization?organizations.find(org=>org.name===project.organization)?.id:'east');
export const inActiveOrganization=project=>!!activeOrganization()&&projectOrganizationId(project)===activeOrganization().id;
