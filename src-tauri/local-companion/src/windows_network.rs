use std::{mem::size_of, net::Ipv4Addr, ptr};
use windows_sys::Win32::{
    NetworkManagement::{
        IpHelper::{
            GetAdaptersAddresses, GAA_FLAG_SKIP_ANYCAST, GAA_FLAG_SKIP_DNS_SERVER,
            GAA_FLAG_SKIP_MULTICAST, IF_TYPE_ETHERNET_CSMACD, IF_TYPE_IEEE80211,
            IP_ADAPTER_ADDRESSES_LH,
        },
        Ndis::IfOperStatusUp,
    },
    Networking::WinSock::{AF_INET, SOCKADDR_IN},
};

pub fn addresses() -> Vec<Ipv4Addr> {
    let mut length = 15_000u32;
    let mut output = Vec::new();
    for _ in 0..3 {
        // The adapter records and their linked lists reside in this aligned buffer.
        let mut buffer = vec![0u64; (length as usize).div_ceil(size_of::<u64>())];
        let head = buffer.as_mut_ptr().cast::<IP_ADAPTER_ADDRESSES_LH>();
        let result = unsafe {
            GetAdaptersAddresses(
                AF_INET.into(),
                GAA_FLAG_SKIP_ANYCAST | GAA_FLAG_SKIP_MULTICAST | GAA_FLAG_SKIP_DNS_SERVER,
                ptr::null(),
                head,
                &mut length,
            )
        };
        if result == 111 && length <= 1_048_576 {
            continue;
        }
        if result != 0 {
            break;
        }
        // Windows initializes every list node on success. All references stay in scope
        // only while the backing buffer is alive.
        let mut next = head;
        while let Some(adapter) = unsafe { next.as_ref() } {
            next = adapter.Next;
            if adapter.OperStatus != IfOperStatusUp {
                continue;
            }
            let kind = match adapter.IfType {
                IF_TYPE_IEEE80211 => 0,
                IF_TYPE_ETHERNET_CSMACD => 1,
                _ => 2,
            };
            let mut next_address = adapter.FirstUnicastAddress;
            while let Some(address) = unsafe { next_address.as_ref() } {
                next_address = address.Next;
                let socket = address.Address;
                if socket.iSockaddrLength < size_of::<SOCKADDR_IN>() as i32 {
                    continue;
                }
                let Some(socket) = (unsafe { socket.lpSockaddr.cast::<SOCKADDR_IN>().as_ref() })
                else {
                    continue;
                };
                if socket.sin_family != AF_INET {
                    continue;
                }
                let ip = Ipv4Addr::from(unsafe { socket.sin_addr.S_un.S_addr }.to_ne_bytes());
                let hotspot = ip == Ipv4Addr::new(192, 168, 137, 1);
                output.push((!hotspot, ip.is_link_local(), kind, adapter.Ipv4Metric, ip));
            }
        }
        break;
    }
    output.sort_unstable();
    output.into_iter().map(|(_, _, _, _, ip)| ip).collect()
}
