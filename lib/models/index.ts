/**
 * MongoDB Models Index
 * Central export point for all Mongoose models
 */

// Global Models (shared across all sites)
export { default as User, type IUser } from './User';
export { default as Site, type ISite } from './Site';
export { default as Role, type IRole } from './Role';
export { default as SiteUser, type ISiteUser } from './SiteUser';
export { default as ActivityLog, type IActivityLog } from './ActivityLog';
export { default as GlobalSetting, type IGlobalSetting } from './GlobalSetting';
export { default as UserMeta, type IUserMeta } from './UserMeta';

// Site-specific Models
export { default as Setting, type ISetting } from './Setting';
export { default as PostType, type IPostType } from './PostType';
export { default as Post, type IPost } from './Post';
export { default as PostMeta, type IPostMeta } from './PostMeta';
export { default as PostRevision, type IPostRevision } from './PostRevision';
export { default as Taxonomy, type ITaxonomy } from './Taxonomy';
export { default as Term, type ITerm } from './Term';
export { default as PostTerm, type IPostTerm } from './PostTerm';
export { default as Menu, type IMenu } from './Menu';
export { default as MenuItem, type IMenuItem } from './MenuItem';
export { default as MenuItemMeta, type IMenuItemMeta } from './MenuItemMeta';
export { default as MenuLocation, type IMenuLocation } from './MenuLocation';
export { default as Media, type IMedia } from './Media';
export { default as MediaFolder, type IMediaFolder } from './MediaFolder';

