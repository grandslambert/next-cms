# GraphQL API

## Overview
Provide a GraphQL API alongside the REST API to enable efficient, flexible data fetching with a single endpoint and client-specified queries.

## Goals
- Enable efficient data fetching (no over/under-fetching)
- Support complex nested queries
- Provide real-time subscriptions
- Complement existing REST API

## Key Features

### Core GraphQL Features
- **Single Endpoint**: `/api/graphql` for all queries
- **Schema Introspection**: Self-documenting API
- **Queries**: Fetch data with precise field selection
- **Mutations**: Create, update, delete operations
- **Subscriptions**: Real-time updates via WebSocket
- **Batching**: Multiple operations in single request

### Type System
- **Strong Typing**: Complete type safety
- **Custom Scalars**: Date, DateTime, JSON, URL types
- **Interfaces**: Shared fields across types
- **Unions**: Multiple possible return types
- **Enums**: Fixed set of values

### Advanced Features
- **Fragments**: Reusable query parts
- **Directives**: Conditional inclusion (@include, @skip)
- **Pagination**: Cursor-based pagination (Relay spec)
- **DataLoader**: Batch and cache database queries
- **Query Complexity**: Prevent expensive queries

## Schema Definition

### Post Type
```graphql
type Post {
  id: ID!
  title: String!
  slug: String!
  content: String
  excerpt: String
  status: PostStatus!
  postType: String!
  authorId: Int!
  author: User!
  featuredImageId: Int
  featuredImage: Media
  categories: [Term!]!
  tags: [Term!]!
  customFields: JSON
  seoTitle: String
  seoDescription: String
  seoKeywords: String
  publishedAt: DateTime
  createdAt: DateTime!
  updatedAt: DateTime!
  revisions(first: Int, after: String): RevisionConnection!
}

enum PostStatus {
  DRAFT
  PENDING
  PUBLISHED
  SCHEDULED
  PRIVATE
}

type PostConnection {
  edges: [PostEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type PostEdge {
  node: Post!
  cursor: String!
}
```

### User Type
```graphql
type User {
  id: ID!
  username: String!
  email: String!
  displayName: String
  role: Role!
  avatar: String
  bio: String
  posts(
    first: Int
    after: String
    status: PostStatus
  ): PostConnection!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type Role {
  id: ID!
  name: String!
  slug: String!
  permissions: [String!]!
}
```

### Media Type
```graphql
type Media {
  id: ID!
  filename: String!
  originalFilename: String!
  mimeType: String!
  fileSize: Int!
  width: Int
  height: Int
  url: String!
  sizes: [MediaSize!]!
  alt: String
  caption: String
  folderId: Int
  folder: MediaFolder
  uploadedBy: Int!
  uploader: User!
  createdAt: DateTime!
}

type MediaSize {
  name: String!
  width: Int!
  height: Int!
  url: String!
  fileSize: Int!
}
```

### Taxonomy & Term Types
```graphql
type Taxonomy {
  id: ID!
  name: String!
  slug: String!
  description: String
  hierarchical: Boolean!
  postTypes: [String!]!
  terms(
    first: Int
    after: String
    parentId: Int
  ): TermConnection!
}

type Term {
  id: ID!
  name: String!
  slug: String!
  description: String
  taxonomy: Taxonomy!
  parentId: Int
  parent: Term
  children: [Term!]!
  posts(first: Int, after: String): PostConnection!
  count: Int!
}
```

### Menu Type
```graphql
type Menu {
  id: ID!
  name: String!
  slug: String!
  location: String
  items: [MenuItem!]!
}

type MenuItem {
  id: ID!
  type: MenuItemType!
  label: String!
  url: String
  target: String
  cssClasses: [String!]
  order: Int!
  parentId: Int
  parent: MenuItem
  children: [MenuItem!]!
  post: Post
  term: Term
}

enum MenuItemType {
  POST
  PAGE
  CATEGORY
  TAG
  CUSTOM
}
```

## Query Examples

### Basic Post Query
```graphql
query GetPost($id: ID!) {
  post(id: $id) {
    id
    title
    content
    author {
      displayName
      avatar
    }
    featuredImage {
      url
      alt
    }
    categories {
      name
      slug
    }
  }
}
```

### Complex Nested Query
```graphql
query GetPosts($first: Int, $status: PostStatus) {
  posts(first: $first, status: $status) {
    edges {
      node {
        id
        title
        excerpt
        author {
          displayName
          posts(first: 3) {
            edges {
              node {
                title
              }
            }
          }
        }
        categories {
          name
          posts(first: 5) {
            totalCount
          }
        }
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
    totalCount
  }
}
```

### Search Query
```graphql
query SearchContent($query: String!) {
  search(query: $query) {
    ... on Post {
      id
      title
      postType
      excerpt
    }
    ... on User {
      id
      displayName
      bio
    }
  }
}
```

### With Fragments
```graphql
fragment PostPreview on Post {
  id
  title
  excerpt
  publishedAt
  author {
    ...AuthorInfo
  }
  featuredImage {
    ...ImageInfo
  }
}

fragment AuthorInfo on User {
  id
  displayName
  avatar
}

fragment ImageInfo on Media {
  url
  alt
  width
  height
}

query GetRecentPosts {
  posts(first: 10, status: PUBLISHED) {
    edges {
      node {
        ...PostPreview
      }
    }
  }
}
```

## Mutation Examples

### Create Post
```graphql
mutation CreatePost($input: CreatePostInput!) {
  createPost(input: $input) {
    success
    message
    post {
      id
      title
      slug
      status
    }
  }
}

# Variables
{
  "input": {
    "title": "My New Post",
    "content": "Post content here",
    "status": "DRAFT",
    "categoryIds": [1, 2],
    "tagIds": [5, 6, 7]
  }
}
```

### Update Post
```graphql
mutation UpdatePost($id: ID!, $input: UpdatePostInput!) {
  updatePost(id: $id, input: $input) {
    success
    message
    post {
      id
      title
      updatedAt
    }
  }
}
```

### Delete Post
```graphql
mutation DeletePost($id: ID!) {
  deletePost(id: $id) {
    success
    message
  }
}
```

### Upload Media
```graphql
mutation UploadMedia($file: Upload!, $folderId: Int) {
  uploadMedia(file: $file, folderId: $folderId) {
    success
    media {
      id
      url
      filename
    }
  }
}
```

### Bulk Operations
```graphql
mutation BulkUpdatePosts($ids: [ID!]!, $input: BulkUpdateInput!) {
  bulkUpdatePosts(ids: $ids, input: $input) {
    success
    updated
    failed
    errors {
      id
      message
    }
  }
}
```

## Subscription Examples

### Post Updates
```graphql
subscription OnPostPublished {
  postPublished {
    id
    title
    author {
      displayName
    }
    publishedAt
  }
}
```

### Real-time Notifications
```graphql
subscription OnNotification($userId: ID!) {
  notification(userId: $userId) {
    type
    message
    data
    createdAt
  }
}
```

### Activity Log
```graphql
subscription OnActivity {
  activityLog {
    action
    user {
      displayName
    }
    description
    timestamp
  }
}
```

## GraphQL Directives

### Built-in Directives
```graphql
query GetUser($includeStats: Boolean!) {
  user(id: 1) {
    displayName
    stats @include(if: $includeStats) {
      postCount
      followerCount
    }
  }
}

query GetPost($skipMeta: Boolean!) {
  post(id: 1) {
    title
    content
    metadata @skip(if: $skipMeta) {
      views
      likes
    }
  }
}
```

### Custom Directives
```graphql
directive @auth(requires: Role) on FIELD_DEFINITION
directive @cacheControl(maxAge: Int) on FIELD_DEFINITION
directive @deprecated(reason: String) on FIELD_DEFINITION

type Post {
  id: ID!
  title: String!
  content: String! @auth(requires: EDITOR)
  views: Int! @cacheControl(maxAge: 300)
  oldField: String @deprecated(reason: "Use newField instead")
}
```

## DataLoader Pattern

### Batch Loading
```typescript
const postLoader = new DataLoader(async (ids) => {
  const posts = await db.query(
    'SELECT * FROM posts WHERE id IN (?)',
    [ids]
  );
  return ids.map(id => posts.find(p => p.id === id));
});

const resolvers = {
  Post: {
    author: (post) => userLoader.load(post.authorId),
    categories: (post) => categoryLoader.loadMany(post.categoryIds)
  }
};
```

## Implementation Phases

### Phase 1: Core Setup (2-3 weeks)
- GraphQL server setup (Apollo Server)
- Basic schema definition
- Query resolvers for posts
- Authentication integration

### Phase 2: Complete Schema (2-3 weeks)
- All content types
- Users and roles
- Media library
- Taxonomies and menus

### Phase 3: Mutations (2 weeks)
- Create operations
- Update operations
- Delete operations
- Bulk operations

### Phase 4: Advanced Features (2-3 weeks)
- DataLoader integration
- Query complexity limits
- Caching layer
- Performance optimization

### Phase 5: Subscriptions (2 weeks)
- WebSocket setup
- Real-time updates
- Notification system
- Activity stream

### Phase 6: Tools & Documentation (1-2 weeks)
- GraphQL Playground
- Schema documentation
- Client examples
- Migration guide

## Client Examples

### Apollo Client (React)
```typescript
import { ApolloClient, InMemoryCache, gql, useQuery } from '@apollo/client';

const client = new ApolloClient({
  uri: 'https://your-site.com/api/graphql',
  cache: new InMemoryCache()
});

const GET_POSTS = gql`
  query GetPosts($first: Int) {
    posts(first: $first, status: PUBLISHED) {
      edges {
        node {
          id
          title
          excerpt
        }
      }
    }
  }
`;

function Posts() {
  const { loading, error, data } = useQuery(GET_POSTS, {
    variables: { first: 10 }
  });

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return data.posts.edges.map(({ node }) => (
    <article key={node.id}>
      <h2>{node.title}</h2>
      <p>{node.excerpt}</p>
    </article>
  ));
}
```

### Urql (React)
```typescript
import { createClient, useQuery } from 'urql';

const client = createClient({
  url: 'https://your-site.com/api/graphql'
});

const Posts = () => {
  const [result] = useQuery({
    query: `
      query {
        posts(first: 10) {
          edges {
            node {
              id
              title
            }
          }
        }
      }
    `
  });

  return <div>{/* render posts */}</div>;
};
```

## User Stories

1. **Front-end Developer**: "I want to fetch exactly the data I need in a single request"
2. **Mobile Developer**: "I want efficient queries to minimize data transfer"
3. **Real-time App Developer**: "I want live updates when content changes"
4. **API Consumer**: "I want self-documenting APIs with type safety"

## Success Metrics
- Query response time: <150ms (p95)
- Data transfer reduction: >40% vs REST
- Developer satisfaction: >4.5/5
- Adoption rate: 30% of API users within 6 months

## Dependencies
- REST API (foundation)
- Advanced caching (for query performance)
- WebSocket support (for subscriptions)

## Risks & Mitigation
- **Risk**: Complex queries causing database overload
  - **Mitigation**: Query complexity limits, cost analysis, timeouts
  
- **Risk**: N+1 query problems
  - **Mitigation**: DataLoader implementation, query planning
  
- **Risk**: Learning curve for developers
  - **Mitigation**: Comprehensive docs, examples, migration guides

## Related Features
- REST API (complementary interface)
- Webhooks (alternative to subscriptions)
- Advanced caching (query caching)

