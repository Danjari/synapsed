import { 
    Node, 
    Edge, 
    NodeChange, 
    EdgeChange, 
    OnNodesChange, 
    OnEdgesChange, 
    applyNodeChanges, 
    applyEdgeChanges,
    Connection
  } from '@xyflow/react';
  import { nanoid } from 'nanoid';
  import { create } from 'zustand';
  
  // Define node data structure
  export type PathwayNodeData = {
      title: string;
      description: string;
      type: 'topic' | 'subtopic' | 'resource' | 'assessment';
      difficulty?: 'beginner' | 'intermediate' | 'advanced';
      duration?: string;
      resourceUrl?: string;
      markdownContent?: string; // Added new optional field for rich content
  };

  // Define pathway node type
  export type PathwayNode = Node<PathwayNodeData>;
  
  // Define our store state
  export type PathwayState = {
    nodes: PathwayNode[];
    edges: Edge[];
    isLoading: boolean;
    error: string | null;
    prompt: string;
    
    // Actions
    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    onConnect: (connection: Connection) => void;
    addNode: (node: Partial<PathwayNode>) => void;
    updateNodeData: (nodeId: string, data: Partial<PathwayNodeData>) => void;
    removeNode: (nodeId: string) => void;
    fetchPathway: (prompt: string) => Promise<void>;
    setPrompt: (prompt: string) => void;
  };
  
  // Create the store
  const usePathwayStore = create<PathwayState>((set, get) => ({
    nodes: [],
    edges: [],
    isLoading: false,
    error: null,
    prompt: "Learning Digital Marketing and how AI can help reach clients. Different tracks.",
    
    // Handle node changes (position, selection, etc.)
    onNodesChange: (changes: NodeChange[]) => {
      set({
        nodes: applyNodeChanges(changes, get().nodes) as PathwayNode[],
      });
    },
    
    // Handle edge changes
    onEdgesChange: (changes: EdgeChange[]) => {
      set({
        edges: applyEdgeChanges(changes, get().edges),
      });
    },
    
    // Handle new connections between nodes
    onConnect: (connection: Connection) => {
      set({
        edges: [
          ...get().edges,
          {
            id: nanoid(),
            source: connection.source!,
            target: connection.target!,
            type: 'pathway'
          }
        ]
      });
    },
    
    // Add a new node
    addNode: (nodePartial: Partial<PathwayNode>) => {
      const newNode: PathwayNode = {
        id: nanoid(),
        type: 'pathway',
        position: { x: 0, y: 0 },
        data: {
          title: 'New Node',
          description: 'Add description here',
          type: 'topic'
        },
        ...nodePartial
      };
      
      set({
        nodes: [...get().nodes, newNode]
      });
      
      return newNode.id;
    },
    
    // Update node data
    updateNodeData: (nodeId: string, data: Partial<PathwayNodeData>) => {
      set({
        nodes: get().nodes.map(node => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: { ...node.data, ...data }
            };
          }
          return node;
        })
      });
    },
    
    // Remove a node and its connected edges
    removeNode: (nodeId: string) => {
      set({
        nodes: get().nodes.filter(node => node.id !== nodeId),
        edges: get().edges.filter(edge => 
          edge.source !== nodeId && edge.target !== nodeId
        )
      });
    },
    
    // Fetch pathway data
    fetchPathway: async (prompt: string) => {
      set({ isLoading: true, error: null });
      
      try {
        // In a real app, this would call your API
        // For now, we'll simulate a response with dummy data
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Create dummy data based on prompt
        const dummyData = generateDummyPathway(prompt);
        
        set({
          nodes: dummyData.nodes,
          edges: dummyData.edges,
          isLoading: false,
          prompt
        });
      } catch (error) {
        console.error(error);
        set({ 
          error: error instanceof Error ? error.message : 'An unknown error occurred',
          isLoading: false 
        });
      }
    },
    
    // Update prompt
    setPrompt: (prompt: string) => {
      set({ prompt });
    }
  }));
  
  // Helper function to generate dummy pathway data
  function generateDummyPathway(prompt: string): { nodes: PathwayNode[]; edges: Edge[] } {
    // Digital Marketing pathway dummy data
    if (prompt.toLowerCase().includes('digital marketing')) {
      const nodes: PathwayNode[] = [
        {
          id: '1',
          type: 'pathway',
          position: { x: 250, y: 5 },
          data: {
            title: 'Digital Marketing Fundamentals',
            description: 'Core concepts and strategies in digital marketing',
            type: 'topic',
            difficulty: 'beginner',
            duration: '2 weeks',
            markdownContent: `### Digital Marketing Fundamentals

Digital marketing encompasses all marketing efforts that use the internet or electronic devices. It includes channels such as:

- Social Media
- Search Engines
- Email Marketing
- Content Marketing

Mastering the fundamentals sets the stage for advanced strategies.`,
          }
        },
        {
          id: '2',
          type: 'pathway',
          position: { x: 100, y: 100 },
          data: {
            title: 'Content Marketing',
            description: 'Creating valuable content to attract audience',
            type: 'subtopic',
            difficulty: 'beginner',
            duration: '1 week',
            markdownContent: `### Content Marketing

Content marketing involves creating and distributing valuable, relevant content to attract and engage a target audience. Common formats include:

- Blog Posts
- Infographics
- Videos
- Podcasts`,
          }
        },
        {
          id: '3',
          type: 'pathway',
          position: { x: 400, y: 100 },
          data: {
            title: 'AI in Marketing',
            description: 'Using AI tools to enhance marketing strategies',
            type: 'subtopic',
            difficulty: 'intermediate',
            duration: '1 week',
            markdownContent: `### AI in Marketing

AI tools can automate and enhance marketing tasks like:

- Personalization
- Predictive Analytics
- Chatbots
- A/B Testing

AI allows for data-driven decision making at scale.`,
          }
        },
        {
          id: '4',
          type: 'pathway',
          position: { x: 100, y: 200 },
          data: {
            title: 'Content Calendar Creation',
            description: 'Learn to structure and plan content',
            type: 'resource',
            resourceUrl: 'https://example.com/content-calendar',
            markdownContent: `### Content Calendar Creation

A content calendar helps plan, organize, and schedule content. It improves consistency and collaboration in marketing teams.`,
          }
        },
        {
          id: '5',
          type: 'pathway',
          position: { x: 250, y: 200 },
          data: {
            title: 'SEO Optimization',
            description: 'Making content discoverable through search engines',
            type: 'resource',
            resourceUrl: 'https://example.com/seo-guide',
            markdownContent: `### SEO Optimization

Search Engine Optimization improves website visibility in search engine results. Key techniques include:

- Keyword Research
- On-page Optimization
- Backlinking
- Technical SEO`,
          }
        },
        {
          id: '6',
          type: 'pathway',
          position: { x: 400, y: 200 },
          data: {
            title: 'AI Content Tools',
            description: 'Overview of AI tools for content generation',
            type: 'resource',
            resourceUrl: 'https://example.com/ai-tools',
            markdownContent: `### Linear Regression

Linear regression models the relationship between two variables using a straight line.

#### 🧠 Formula

The equation:

$$
y = mx + b
$$

Where:

- \$begin:math:text$ y \\$end:math:text$: predicted value  
- \$begin:math:text$ m \\$end:math:text$: slope  
- \$begin:math:text$ x \\$end:math:text$: input variable  
- \$begin:math:text$ b \\$end:math:text$: y-intercept

#### 💻 Code Example

\`\`\`python
from sklearn.linear_model import LinearRegression
import numpy as np

# Sample data
X = np.array([[1], [2], [3], [4]])
y = np.array([2, 4, 6, 8])

# Model training
model = LinearRegression()
model.fit(X, y)

# Prediction
print(model.predict([[5]]))  # Output: [10.]
\`\`\`
Where:

- \$begin:math:text$ y \\$end:math:text$: predicted value  
- \$begin:math:text$ m \\$end:math:text$: slope  
- \$begin:math:text$ x \\$end:math:text$: input variable  
- \$begin:math:text$ b \\$end:math:text$: y-intercept

#### 💻 Code Example

\`\`\`python
from sklearn.linear_model import LinearRegression
import numpy as np

# Sample data
X = np.array([[1], [2], [3], [4]])
y = np.array([2, 4, 6, 8])

`,
          }
            
        },
        {
          id: '7',
          type: 'pathway',
          position: { x: 250, y: 300 },
          data: {
            title: 'Marketing Strategy Assessment',
            description: 'Test your knowledge on integrated marketing approaches',
            type: 'assessment',
            duration: '1 hour',
            markdownContent: `### Marketing Strategy Assessment

Assess your understanding of marketing concepts through a quiz or short reflective exercise.`,
          }
        }
      ];
      
      const edges: Edge[] = [
        { id: 'e1-2', source: '1', target: '2', type: 'pathway' },
        { id: 'e1-3', source: '1', target: '3', type: 'pathway' },
        { id: 'e2-4', source: '2', target: '4', type: 'pathway' },
        { id: 'e2-5', source: '2', target: '5', type: 'pathway' },
        { id: 'e3-6', source: '3', target: '6', type: 'pathway' },
        { id: 'e3-5', source: '3', target: '5', type: 'pathway' },
        { id: 'e4-7', source: '4', target: '7', type: 'pathway' },
        { id: 'e5-7', source: '5', target: '7', type: 'pathway' },
        { id: 'e6-7', source: '6', target: '7', type: 'pathway' }
      ];
      
      return { nodes, edges };
    }
    
    // Default generic learning pathway
    const nodes: PathwayNode[] = [
      {
        id: '1',
        type: 'pathway',
        position: { x: 250, y: 25 },
        data: {
          title: 'Learning Pathway',
          description: 'Custom learning path based on your interests',
          type: 'topic',
          difficulty: 'beginner',
          duration: '4 weeks'
        }
      },
      {
        id: '2',
        type: 'pathway',
        position: { x: 100, y: 125 },
        data: {
          title: 'Fundamentals',
          description: 'Core concepts and principles',
          type: 'subtopic',
          difficulty: 'beginner',
          duration: '1 week'
        }
      },
      {
        id: '3',
        type: 'pathway',
        position: { x: 400, y: 125 },
        data: {
          title: 'Advanced Topics',
          description: 'In-depth exploration of complex subjects',
          type: 'subtopic',
          difficulty: 'advanced',
          duration: '2 weeks'
        }
      },
      {
        id: '4',
        type: 'pathway',
        position: { x: 250, y: 250 },
        data: {
          title: 'Final Project',
          description: 'Apply what you\'ve learned in a practical project',
          type: 'assessment',
          duration: '1 week'
        }
      }
    ];
    
    const edges: Edge[] = [
      { id: 'e1-2', source: '1', target: '2', type: 'pathway' },
      { id: 'e1-3', source: '1', target: '3', type: 'pathway' },
      { id: 'e2-4', source: '2', target: '4', type: 'pathway' },
      { id: 'e3-4', source: '3', target: '4', type: 'pathway' }
    ];
    
    return { nodes, edges };
  }
  
  export default usePathwayStore;