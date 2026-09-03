'use client'

import { CurrencyCode } from '@/lib/currency'
import { AdvertiserDealCard } from '../DealManagement'
import StatusToast from './StatusToast'
import ChannelFilters from './ChannelFilters'
import ChannelCard from './ChannelCard'

export default function AdvertiserView({
  toast,
  advertiserTab,
  setAdvertiserTab,
  search,
  setSearch,
  minSubs,
  setMinSubs,
  maxSubs,
  setMaxSubs,
  minViews,
  setMinViews,
  maxViews,
  setMaxViews,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  selectedSocialNet,
  setSelectedSocialNet,
  selectedCountry,
  setSelectedCountry,
  displayCurrency,
  setDisplayCurrency,
  sortBy,
  setSortBy,
  showFilters,
  setShowFilters,
  loading,
  filteredChannels,
  rates,
  myChannelIds,
  filteredSentRequests,
  channelMap,
  userId,
  onUpdateRequest,
  showToast,
}: {
  toast: string | null
  advertiserTab: 'catalog' | 'requests'
  setAdvertiserTab: (tab: 'catalog' | 'requests') => void
  search: string
  setSearch: (v: string) => void
  minSubs: number
  setMinSubs: (v: number) => void
  maxSubs: number
  setMaxSubs: (v: number) => void
  minViews: number
  setMinViews: (v: number) => void
  maxViews: number
  setMaxViews: (v: number) => void
  minPrice: number
  setMinPrice: (v: number) => void
  maxPrice: number
  setMaxPrice: (v: number) => void
  selectedSocialNet: string
  setSelectedSocialNet: (v: string) => void
  selectedCountry: string
  setSelectedCountry: (v: string) => void
  displayCurrency: CurrencyCode
  setDisplayCurrency: (v: CurrencyCode) => void
  sortBy: string
  setSortBy: (v: string) => void
  showFilters: boolean
  setShowFilters: (v: boolean) => void
  loading: boolean
  filteredChannels: any[]
  rates: Record<string, number>
  myChannelIds: string[]
  filteredSentRequests: any[]
  channelMap: Record<string, any>
  userId: string
  onUpdateRequest: (id: string, patch: Record<string, unknown>) => void
  showToast: () => void
}) {
  return (
    <div>
      <StatusToast message={toast} />
      <h1 className="text-2xl font-bold text-white mb-2">Маркетплейс</h1>
      <p className="text-white/50 mb-6">Каталог каналов и ваши запросы</p>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setAdvertiserTab('catalog')} className={`rounded-full px-4 py-2 text-sm transition ${advertiserTab === 'catalog' ? 'tab-pill-active' : 'border border-white/20 text-white/70'}`}>
          Каталог каналов
        </button>
        <button onClick={() => setAdvertiserTab('requests')} className={`rounded-full px-4 py-2 text-sm transition ${advertiserTab === 'requests' ? 'tab-pill-active' : 'border border-white/20 text-white/70'}`}>
          Мои запросы
        </button>
      </div>

      {advertiserTab === 'catalog' && (
        <>
          <ChannelFilters
            search={search}
            setSearch={setSearch}
            minSubs={minSubs}
            setMinSubs={setMinSubs}
            maxSubs={maxSubs}
            setMaxSubs={setMaxSubs}
            minViews={minViews}
            setMinViews={setMinViews}
            maxViews={maxViews}
            setMaxViews={setMaxViews}
            minPrice={minPrice}
            setMinPrice={setMinPrice}
            maxPrice={maxPrice}
            setMaxPrice={setMaxPrice}
            selectedSocialNet={selectedSocialNet}
            setSelectedSocialNet={setSelectedSocialNet}
            selectedCountry={selectedCountry}
            setSelectedCountry={setSelectedCountry}
            displayCurrency={displayCurrency}
            setDisplayCurrency={setDisplayCurrency}
            sortBy={sortBy}
            setSortBy={setSortBy}
            showFilters={showFilters}
            setShowFilters={setShowFilters}
          />

          {loading ? (
            <div className="text-white/50 text-center py-24">Загрузка...</div>
          ) : filteredChannels.length === 0 ? (
            <div className="text-center py-24">
              <i className="ti ti-search" style={{ fontSize: '48px', color: 'rgba(255,255,255,0.25)' }} />
              <div className="text-white font-medium mb-2">Каналов не найдено</div>
              <div className="text-white/40 text-sm">Попробуй изменить фильтры</div>
            </div>
          ) : (
            <div className="ui-marketplace-grid">
              {filteredChannels.map((channel) => (
                <ChannelCard
                  key={channel.id}
                  channel={channel}
                  displayCurrency={displayCurrency}
                  rates={rates}
                  myChannelIds={myChannelIds}
                />
              ))}
            </div>
          )}
        </>
      )}

      {advertiserTab === 'requests' && (
        <input
          placeholder="Поиск по каналу или сообщению..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="marketplace-search-input mb-4"
        />
      )}

      {advertiserTab === 'requests' && (
        loading ? (
          <div className="text-white/50 text-center py-24">Загрузка...</div>
        ) : filteredSentRequests.length === 0 ? (
          <div className="text-center py-24">
            <i className="ti ti-clipboard-list" style={{ fontSize: '48px', color: 'rgba(255,255,255,0.25)' }} />
            <div className="text-white font-medium mb-2">Запросов не найдено</div>
            <div className="text-white/40 text-sm">Вы ещё не отправляли запросов на каналы</div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredSentRequests.map((req) => (
              <AdvertiserDealCard
                key={req.id}
                request={req}
                channelMap={channelMap}
                userId={userId}
                onUpdate={(id, patch) => {
                  onUpdateRequest(id, patch)
                  showToast()
                }}
                linkToDeal
              />
            ))}
          </div>
        )
      )}
    </div>
  )
}
