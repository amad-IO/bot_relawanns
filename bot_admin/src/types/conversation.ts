/**
 * CONVERSATION TYPES
 * Type definitions untuk conversation flow bot admin
 * 
 * Digunakan untuk state management saat admin melakukan edit event
 */

import { Context } from 'grammy';
import { Conversation, ConversationFlavor } from '@grammyjs/conversations';

/**
 * Enum untuk conversation state
 * Setiap state represent step dalam conversation
 */
export enum ConversationState {
    IDLE = 'idle',
    WAITING_TITLE = 'waiting_title',
    WAITING_LOCATION = 'waiting_location',
    WAITING_DATE = 'waiting_date',
    WAITING_QUOTA = 'waiting_quota',
    WAITING_REQUIREMENTS = 'waiting_requirements',
    WAITING_DESCRIPTION = 'waiting_description',
    WAITING_CATEGORY = 'waiting_category',
}

/**
 * Extended context dengan conversation flavor
 * Ini adalah context yang akan digunakan di seluruh bot
 * Note: Simplified type to avoid TS type compatibility issues with conversations plugin
 */
export type MyContext = Context & ConversationFlavor<Context>;

/**
 * Type untuk conversation function
 * Digunakan untuk define conversation handlers
 */
export type MyConversation = Conversation<MyContext>;
