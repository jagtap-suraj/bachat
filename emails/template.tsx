import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { CSSProperties } from "react";

// Dummy data for preview
const PREVIEW_DATA = {
  monthlyReport: {
    userName: "John Doe",
    type: "monthly-report",
    data: {
      month: "December",
      stats: {
        totalIncome: 5000,
        totalExpenses: 3500,
        byCategory: {
          housing: 1500,
          groceries: 600,
          transportation: 400,
          entertainment: 300,
          utilities: 700,
        },
      },
      insights: [
        "Your housing expenses are 43% of your total spending - consider reviewing your housing costs.",
        "Great job keeping entertainment expenses under control this month!",
        "Setting up automatic savings could help you save 20% more of your income.",
      ],
    },
  },
  budgetAlert: {
    userName: "John Doe",
    type: "budget-alert",
    data: {
      percentageUsed: 85,
      budgetAmount: 4000,
      totalExpenses: 3400,
    },
  },
};

const styles: { [key: string]: CSSProperties } = {
  body: {
    backgroundColor: "#f6f9fc",
    fontFamily: "-apple-system, sans-serif",
  },
  container: {
    backgroundColor: "#ffffff",
    margin: "0 auto",
    padding: "20px",
    borderRadius: "5px",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
  },
  title: {
    color: "#1f2937",
    fontSize: "32px",
    fontWeight: "bold",
    textAlign: "center",
    margin: "0 0 20px",
  },
  heading: {
    color: "#1f2937",
    fontSize: "20px",
    fontWeight: "600",
    margin: "0 0 16px",
  },
  text: {
    color: "#4b5563",
    fontSize: "16px",
    margin: "0 0 16px",
  },
  section: {
    marginTop: "32px",
    padding: "20px",
    backgroundColor: "#f9fafb",
    borderRadius: "5px",
    border: "1px solid #e5e7eb",
  },
  statsContainer: {
    margin: "32px 0",
    padding: "20px",
    backgroundColor: "#f9fafb",
    borderRadius: "5px",
  },
  stat: {
    marginBottom: "16px",
    padding: "12px",
    backgroundColor: "#fff",
    borderRadius: "4px",
    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    padding: "12px 0",
    borderBottom: "1px solid #e5e7eb",
  },
  footer: {
    color: "#6b7280",
    fontSize: "14px",
    textAlign: "center",
    marginTop: "32px",
    paddingTop: "16px",
    borderTop: "1px solid #e5e7eb",
  },
};

export type MonthlyReportDataType = typeof PREVIEW_DATA.monthlyReport.data;
export type BudgetAlertDataType = typeof PREVIEW_DATA.budgetAlert.data;

// Component for the stat item
const StatItem = ({ label, value }: { label: string; value: string | number }) => (
  <div style={styles.stat}>
    <Text style={styles.text}>{label}</Text>
    <Text style={styles.heading}>{value}</Text>
  </div>
);

// Component for category breakdown rows
const CategoryRow = ({ category, amount }: { category: string; amount: number }) => (
  <div key={category} style={styles.row}>
    <Text style={styles.text}>{category}</Text>
    <Text style={styles.text}>${amount}</Text>
  </div>
);

// Component for insights
const InsightsList = ({ insights }: { insights: string[] }) => (
  <Section style={styles.section}>
    <Heading style={styles.heading}>Bachat Insights</Heading>
    {insights.map((insight, index) => (
      <Text key={index} style={styles.text}>
        • {insight}
      </Text>
    ))}
  </Section>
);

// Monthly Report Email Component
const MonthlyReportEmail = ({ 
  userName, 
  data 
}: { 
  userName: string | null; 
  data: MonthlyReportDataType 
}) => (
  <Html>
    <Head />
    <Preview>Your Monthly Financial Report</Preview>
    <Body style={styles.body}>
      <Container style={styles.container}>
        <Heading style={styles.title}>Monthly Financial Report</Heading>

        <Text style={styles.text}>Hello {userName},</Text>
        <Text style={styles.text}>
          Here&rsquo;s your financial summary for {data?.month}:
        </Text>

        {/* Main Stats */}
        <Section style={styles.statsContainer}>
          <StatItem label="Total Income" value={`$${data?.stats?.totalIncome}`} />
          <StatItem label="Total Expenses" value={`$${data?.stats?.totalExpenses}`} />
          <StatItem 
            label="Net" 
            value={`$${(data?.stats?.totalIncome ?? 0) - (data?.stats?.totalExpenses ?? 0)}`} 
          />
        </Section>

        {/* Category Breakdown */}
        {data?.stats?.byCategory && (
          <Section style={styles.section}>
            <Heading style={styles.heading}>Expenses by Category</Heading>
            {Object.entries(data?.stats?.byCategory).map(
              ([category, amount]) => (
                <CategoryRow key={category} category={category} amount={amount} />
              )
            )}
          </Section>
        )}

        {/* AI Insights */}
        {data?.insights && <InsightsList insights={data.insights} />}

        <Text style={styles.footer}>
          Thank you for using Bachat. Keep tracking your finances for better
          financial health!
        </Text>
      </Container>
    </Body>
  </Html>
);

// Budget Alert Email Component
const BudgetAlertEmail = ({ 
  userName, 
  data 
}: { 
  userName: string | null; 
  data: BudgetAlertDataType 
}) => (
  <Html>
    <Head />
    <Preview>Budget Alert</Preview>
    <Body style={styles.body}>
      <Container style={styles.container}>
        <Heading style={styles.title}>Budget Alert</Heading>
        <Text style={styles.text}>Hello {userName},</Text>
        <Text style={styles.text}>
          You&rsquo;ve used {data?.percentageUsed.toFixed(1)}% of your
          monthly budget.
        </Text>
        <Section style={styles.statsContainer}>
          <StatItem label="Budget Amount" value={`$${data?.budgetAmount}`} />
          <StatItem label="Spent So Far" value={`$${data?.totalExpenses}`} />
          <StatItem 
            label="Remaining" 
            value={`$${(data?.budgetAmount ?? 0) - (data?.totalExpenses ?? 0)}`} 
          />
        </Section>
      </Container>
    </Body>
  </Html>
);

// Fallback Email Component
const FallbackEmail = ({ userName }: { userName: string | null }) => (
  <Html>
    <Head />
    <Preview>Email Preview</Preview>
    <Body style={styles.body}>
      <Container style={styles.container}>
        <Heading style={styles.title}>Email Preview</Heading>
        <Text style={styles.text}>
          {userName ? `Hello ${userName},` : "Hello,"}
        </Text>
        <Text style={styles.text}>
          The email content could not be displayed.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default function EmailTemplate({
  userName = "",
  type = "monthly-report",
  data = null,
}: {
  userName?: string | null;
  type?: string;
  data?: MonthlyReportDataType | BudgetAlertDataType | null;
}) {
  if (type === "monthly-report" && isMonthlyReportData(data)) {
    return <MonthlyReportEmail userName={userName} data={data} />;
  }

  if (type === "budget-alert" && isBudgetAlertData(data)) {
    return <BudgetAlertEmail userName={userName} data={data} />;
  }

  return <FallbackEmail userName={userName} />;
}

// Improved type guards for better type safety
function isMonthlyReportData(data: any): data is MonthlyReportDataType {
  return data && 
    typeof data === 'object' && 
    'month' in data && 
    'stats' in data && 
    'insights' in data;
}

function isBudgetAlertData(data: any): data is BudgetAlertDataType {
  return data && 
    typeof data === 'object' && 
    'percentageUsed' in data && 
    'budgetAmount' in data &&
    'totalExpenses' in data;
}
