import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface ReportCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
  category: 'actor' | 'time' | 'export';
}

@Component({
  selector: 'app-reports-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6 max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          📊 Reports Dashboard
        </h1>
        <p class="text-gray-600 dark:text-gray-400">
          View and export comprehensive cash management reports
        </p>
      </div>

      <!-- Quick Stats -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div class="text-blue-600 dark:text-blue-400 text-sm font-medium mb-1">Today's Collections</div>
          <div class="text-2xl font-bold text-blue-900 dark:text-blue-300">₱125,450</div>
        </div>
        <div class="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
          <div class="text-green-600 dark:text-green-400 text-sm font-medium mb-1">Active Collectors</div>
          <div class="text-2xl font-bold text-green-900 dark:text-green-300">12</div>
        </div>
        <div class="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
          <div class="text-purple-600 dark:text-purple-400 text-sm font-medium mb-1">Cash in Hand</div>
          <div class="text-2xl font-bold text-purple-900 dark:text-purple-300">₱85,200</div>
        </div>
        <div class="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
          <div class="text-orange-600 dark:text-orange-400 text-sm font-medium mb-1">Pending Reports</div>
          <div class="text-2xl font-bold text-orange-900 dark:text-orange-300">3</div>
        </div>
      </div>

      <!-- Reports by Actor -->
      <div class="mb-8">
        <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span class="text-2xl">👥</span>
          Reports by Actor
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          @for (report of actorReports; track report.id) {
            <button
              (click)="navigateTo(report.route)"
              class="text-left bg-white dark:bg-gray-800 rounded-lg p-6 border-2 border-gray-200 dark:border-gray-700 hover:border-{{report.color}}-500 hover:shadow-lg transition-all group">
              <div class="flex items-start gap-4">
                <div class="text-4xl group-hover:scale-110 transition-transform">
                  {{ report.icon }}
                </div>
                <div class="flex-1">
                  <h3 class="font-bold text-lg text-gray-900 dark:text-white mb-1">
                    {{ report.title }}
                  </h3>
                  <p class="text-sm text-gray-600 dark:text-gray-400">
                    {{ report.description }}
                  </p>
                  <div class="mt-3 text-{{report.color}}-600 dark:text-{{report.color}}-400 text-sm font-medium flex items-center gap-1">
                    View Reports
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                    </svg>
                  </div>
                </div>
              </div>
            </button>
          }
        </div>
      </div>

      <!-- Reports by Time Period -->
      <div class="mb-8">
        <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span class="text-2xl">📅</span>
          Reports by Time Period
        </h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          @for (report of timeReports; track report.id) {
            <button
              (click)="navigateTo(report.route)"
              class="bg-gradient-to-br from-{{report.color}}-50 to-{{report.color}}-100 dark:from-{{report.color}}-900/20 dark:to-{{report.color}}-800/20 rounded-lg p-5 border border-{{report.color}}-200 dark:border-{{report.color}}-800 hover:shadow-md transition-all">
              <div class="text-3xl mb-2">{{ report.icon }}</div>
              <div class="font-bold text-{{report.color}}-900 dark:text-{{report.color}}-300 mb-1">
                {{ report.title }}
              </div>
              <div class="text-xs text-{{report.color}}-600 dark:text-{{report.color}}-400">
                {{ report.description }}
              </div>
            </button>
          }
        </div>
      </div>

      <!-- Export Options -->
      <div>
        <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span class="text-2xl">📤</span>
          Export Reports
        </h2>
        <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            @for (report of exportReports; track report.id) {
              <button
                (click)="handleExport(report.id)"
                class="flex items-center gap-4 p-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-{{report.color}}-500 hover:bg-{{report.color}}-50 dark:hover:bg-{{report.color}}-900/20 transition-all group">
                <div class="text-4xl group-hover:scale-110 transition-transform">
                  {{ report.icon }}
                </div>
                <div class="text-left flex-1">
                  <div class="font-bold text-gray-900 dark:text-white mb-1">
                    {{ report.title }}
                  </div>
                  <div class="text-sm text-gray-600 dark:text-gray-400">
                    {{ report.description }}
                  </div>
                </div>
                <svg class="w-6 h-6 text-gray-400 group-hover:text-{{report.color}}-600 dark:group-hover:text-{{report.color}}-400"
                     fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                </svg>
              </button>
            }
          </div>
        </div>
      </div>

      <!-- Recent Reports -->
      <div class="mt-8">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span class="text-2xl">📋</span>
            Recent Reports
          </h2>
          <button class="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            View All
          </button>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table class="w-full">
            <thead class="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Report Name
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Generated
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              <tr class="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  Daily Collections Report
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                  Collector
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                  2 hours ago
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                  <button class="text-blue-600 dark:text-blue-400 hover:underline mr-3">View</button>
                  <button class="text-green-600 dark:text-green-400 hover:underline">Download</button>
                </td>
              </tr>
              <tr class="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  Weekly Cashier Summary
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                  Cashier
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                  Yesterday
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                  <button class="text-blue-600 dark:text-blue-400 hover:underline mr-3">View</button>
                  <button class="text-green-600 dark:text-green-400 hover:underline">Download</button>
                </td>
              </tr>
              <tr class="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  Customer Payment History
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                  Customer
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                  3 days ago
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                  <button class="text-blue-600 dark:text-blue-400 hover:underline mr-3">View</button>
                  <button class="text-green-600 dark:text-green-400 hover:underline">Download</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class ReportsDashboardComponent {
  private router = inject(Router);

  actorReports: ReportCard[] = [
    {
      id: 'customers',
      title: 'Customer Reports',
      description: 'Daily payments, weekly summary, monthly balance',
      icon: '🗂️',
      route: '/platforms/money-loan/admin/cashier/reports/customers',
      color: 'blue',
      category: 'actor'
    },
    {
      id: 'collectors',
      title: 'Collector Reports',
      description: 'Cash flow, performance, monthly collections',
      icon: '💼',
      route: '/platforms/money-loan/admin/cashier/reports/collectors',
      color: 'green',
      category: 'actor'
    },
    {
      id: 'cashiers',
      title: 'Cashier Reports',
      description: 'Daily book, weekly deposits, monthly summary',
      icon: '💵',
      route: '/platforms/money-loan/admin/cashier/reports/cashiers',
      color: 'purple',
      category: 'actor'
    }
  ];

  timeReports: ReportCard[] = [
    {
      id: 'today',
      title: 'Today',
      description: 'Current day activity',
      icon: '📆',
      route: '/platforms/money-loan/admin/cashier/reports/today',
      color: 'blue',
      category: 'time'
    },
    {
      id: 'week',
      title: 'This Week',
      description: 'Weekly summary',
      icon: '📅',
      route: '/platforms/money-loan/admin/cashier/reports/week',
      color: 'green',
      category: 'time'
    },
    {
      id: 'month',
      title: 'This Month',
      description: 'Monthly report',
      icon: '🗓️',
      route: '/platforms/money-loan/admin/cashier/reports/month',
      color: 'purple',
      category: 'time'
    },
    {
      id: 'custom',
      title: 'Custom Range',
      description: 'Select date range',
      icon: '📊',
      route: '/platforms/money-loan/admin/cashier/reports/custom',
      color: 'orange',
      category: 'time'
    }
  ];

  exportReports: ReportCard[] = [
    {
      id: 'pdf',
      title: 'Export to PDF',
      description: 'Download professional PDF reports',
      icon: '📄',
      route: '',
      color: 'red',
      category: 'export'
    },
    {
      id: 'excel',
      title: 'Export to Excel',
      description: 'Download data in spreadsheet format',
      icon: '📊',
      route: '',
      color: 'green',
      category: 'export'
    }
  ];

  navigateTo(route: string): void {
    if (route) {
      this.router.navigate([route]);
    }
  }

  handleExport(type: string): void {
    alert(`Exporting report as ${type.toUpperCase()}...`);
    // TODO: Implement actual export functionality
  }
}
