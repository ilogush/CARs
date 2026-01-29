import { CalendarIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'

export default function TasksWidget({ tasks }: { tasks: any[] }) {
  if (!tasks || tasks.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col items-center justify-center h-full min-h-[300px]">
        <div className="bg-gray-50 p-4 rounded-full mb-4">
          <ClipboardListIcon className="h-8 w-8 text-gray-500" />
        </div>
        <h3 className="text-lg font-medium text-gray-900">No active tasks</h3>
        <p className="text-sm text-gray-500 mt-1 text-center">All tasks completed! Time for coffee ☕</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col h-full">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-900">My Tasks</h2>
        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-800">
          {tasks.length}
        </span>
      </div>
      <div className="overflow-y-auto flex-1 p-0">
        <ul className="divide-y divide-gray-100">
          {tasks.map((task) => (
            <li key={task.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${task.priority === 'high' ? 'bg-red-500' :
                    task.priority === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                    }`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{task.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{task.description}</p>
                    <div className="flex items-center mt-2 space-x-3">
                      {task.due_date && (
                        <div className="flex items-center text-xs text-gray-500">
                          <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                          {new Date(task.due_date).toLocaleDateString()}
                        </div>
                      )}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${task.status === 'pending' ? 'bg-yellow-50 text-yellow-700' :
                        task.status === 'in_progress' ? 'bg-blue-50 text-blue-700' :
                          'bg-gray-200 text-gray-500'
                        }`}>
                        {task.status === 'pending' ? 'pending' :
                          task.status === 'in_progress' ? 'in progress' : 'done'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="p-4 border-t border-gray-200 bg-gray-50 text-center">
        <button className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
          View all tasks
        </button>
      </div>
    </div>
  )
}

function ClipboardListIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  )
}



