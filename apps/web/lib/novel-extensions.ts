// lib/novel-extensions.ts
import { Node } from '@tiptap/core'

export const PageLinkNode = Node.create({
  name: 'pageLink',
  
  addAttributes() {
    return {
      pageId: {
        default: null,
        parseHTML: element => element.getAttribute('data-page-id'),
        renderHTML: attributes => ({
          'data-page-id': attributes.pageId,
        }),
      },
      pageTitle: {
        default: '',
        parseHTML: element => element.getAttribute('data-page-title'),
        renderHTML: attributes => ({
          'data-page-title': attributes.pageTitle,
        }),
      }
    }
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'a', 
      {
        ...HTMLAttributes,
        href: `/page/${node.attrs.pageId}`,
        class: 'page-link'
      }, 
      node.attrs.pageTitle
    ]
  },

  parseHTML() {
    return [
      {
        tag: 'a.page-link',
        getAttrs: dom => {
          const pageId = dom.getAttribute('data-page-id')
          const pageTitle = dom.getAttribute('data-page-title')
          return { pageId, pageTitle }
        }
      }
    ]
  }
})